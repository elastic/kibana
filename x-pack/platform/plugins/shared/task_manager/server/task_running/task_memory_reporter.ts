/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskMemoryReporter } from '../task';

/** The reporter handed to a run, plus what the runner reads back from it. */
export interface RunMemoryReporter {
  readonly reporter: TaskMemoryReporter;
  /** Largest value reported so far, or undefined when the run has not reported. */
  peakReportedBytes(): number | undefined;
  /** Bytes currently reserved by the run, 0 when none. */
  reservedBytes(): number;
  /** Ignores every call that follows, so a promise that outlives the run cannot touch the next one. */
  close(): void;
}

const isValidBytes = (bytes: number): boolean => Number.isFinite(bytes) && bytes >= 0;

/** A reporter that records: used with adaptive capacity when task reports are on. */
export const createRunMemoryReporter = (): RunMemoryReporter => {
  let peak: number | undefined;
  let reserved = 0;
  let closed = false;
  return {
    reporter: {
      reserve: (bytes) => {
        if (!closed && isValidBytes(bytes)) reserved = bytes;
      },
      release: () => {
        if (!closed) reserved = 0;
      },
      report: (bytes) => {
        if (!closed && isValidBytes(bytes))
          peak = peak === undefined ? bytes : Math.max(peak, bytes);
      },
    },
    peakReportedBytes: () => peak,
    reservedBytes: () => reserved,
    close: () => {
      closed = true;
      reserved = 0;
    },
  };
};

const noop = (): void => undefined;

/** A reporter that ignores every call: fixed capacity, or task reports switched off. */
export const NOOP_RUN_MEMORY_REPORTER: RunMemoryReporter = Object.freeze({
  reporter: Object.freeze({ reserve: noop, release: noop, report: noop }),
  peakReportedBytes: (): number | undefined => undefined,
  reservedBytes: (): number => 0,
  close: noop,
});
