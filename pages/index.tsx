import { Button, Typography } from "@material-ui/core";
import { DateTime, Duration, Interval } from "luxon";
import { NextPage } from "next";
import Head from "next/head";
import React, { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";

interface State {
  now: DateTime;
  mode: Work | Break | Paused;
  history: WorkBreakTimes[];
}

interface Work {
  kind: "work";
  workStartTime: DateTime;
}

interface Break {
  kind: "break";
  workStartTime: DateTime;
  breakStartTime: DateTime;
}

interface Paused {
  kind: "paused";
}

interface WorkBreakTimes {
  workStartTime: DateTime;
  breakStartTime: DateTime;
  breakEndTime: DateTime;
}

const Home: NextPage = () => {
  const [{ now, mode }, setState] = useState<State>(() => ({
    now: DateTime.now(),
    mode: { kind: "paused" },
    history: [],
  }));

  // TODO: Get this to work.
  // useEffect(() => {
  //   const jsonString = localStorage.getItem("rational-breaks-history");
  //   if (jsonString === null) {
  //     return undefined;
  //   }
  //   return JSON.parse(jsonString) || undefined;
  // });
  // useEffect(
  //   () =>
  //     localStorage.setItem("rational-breaks-history", JSON.stringify(history)),
  //   [history]
  // );

  useEffect(() => {
    const interval = setInterval(() => {
      setState((state) => ({ ...state, now: DateTime.now() }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  let colorClass = styles.pausedColor;
  if (mode.kind === "work") {
    colorClass = styles.workColor;
  } else if (mode.kind === "break") {
    const maxBreakTime = getMaxBreakTime(
      mode.workStartTime,
      mode.breakStartTime
    );
    const currentBreakTime = Interval.fromDateTimes(
      mode.breakStartTime,
      now
    ).toDuration();
    if (maxBreakTime > currentBreakTime) {
      colorClass = styles.breakColor;
    } else {
      colorClass = styles.overrunBreakColor;
    }
  }
  return (
    <div>
      <Head>
        <title>Rational Breaks</title>
      </Head>
      <div className={`${styles.modeTitle} ${colorClass}`}>
        <Typography variant="h2">
          {mode.kind === "paused" && <div>Paused</div>}
          {mode.kind === "work" && <div>Working</div>}
          {mode.kind === "break" && (
            <div>
              On a break, max{" "}
              {formatDuration(
                getMaxBreakTime(mode.workStartTime, mode.breakStartTime)
              )}
            </div>
          )}
        </Typography>
      </div>
      <div className={styles.modeDescription}>
        <Typography variant="h6">
          {mode.kind === "paused" && <div>Press "start work" to begin</div>}
          {mode.kind === "work" && (
            <div>
              Started {formatDateTime(mode.workStartTime)}, working for{" "}
              {formatDistance(mode.workStartTime, now)}
            </div>
          )}
          {mode.kind === "break" && (
            <div>
              Worked for{" "}
              {formatDistance(mode.workStartTime, mode.breakStartTime)} (
              {formatDateTime(mode.workStartTime)} to{" "}
              {formatDateTime(mode.breakStartTime)}), on a break for{" "}
              {formatDistance(mode.breakStartTime, now)}
            </div>
          )}
        </Typography>
      </div>
      <div className={styles.mainButton}>
        {(mode.kind === "break" || mode.kind === "paused") && (
          <Button variant="contained" onClick={() => setState(startWork)}>
            Start work
          </Button>
        )}
        {mode.kind === "work" && (
          <Button variant="contained" onClick={() => setState(startBreak)}>
            Start break
          </Button>
        )}
      </div>
    </div>
  );
};

export default Home;

function startWork(state: State): State {
  const history = state.history;
  if (state.mode.kind !== "paused" && state.mode.kind !== "break") {
    throw Error("Tried to start work when already working");
  }
  if (state.mode.kind === "break") {
    history.push({
      workStartTime: state.mode.workStartTime,
      breakStartTime: state.mode.breakStartTime,
      breakEndTime: state.now,
    });
  }
  return {
    ...state,
    mode: {
      kind: "work",
      workStartTime: state.now,
    },
    history,
  };
}

function startBreak(state: State): State {
  if (state.mode.kind !== "work") {
    throw Error("Tried to start break when not working");
  }
  return {
    ...state,
    mode: {
      kind: "break",
      workStartTime: state.mode.workStartTime,
      breakStartTime: state.now,
    },
  };
}

function getMaxBreakTime(
  workStartTime: DateTime,
  workEndTime: DateTime
): Duration {
  const interval = Interval.fromDateTimes(workStartTime, workEndTime);
  return Duration.fromObject({
    milliseconds: interval.toDuration().milliseconds / 3,
  });
}

function formatDateTime(dateTime: DateTime): string {
  return dateTime.toLocaleString(DateTime.TIME_SIMPLE);
}

function formatDistance(start: DateTime, end: DateTime): string {
  return formatDuration(Interval.fromDateTimes(start, end).toDuration());
}

function formatDuration(duration: Duration): string {
  return `${duration.as("minutes").toFixed(0)} mins`;
}

// TODO:
// - Undo button (cancel a break, cancel starting work).
// - Pause button.
// - Clear button.
// - Show time history.
// - Persist state in local storage.
