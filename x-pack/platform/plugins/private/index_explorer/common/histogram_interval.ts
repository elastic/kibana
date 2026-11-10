/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const TARGET_BUCKETS = 60;
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Bucket widths offered to ES|QL `BUCKET()`, smallest first. */
const INTERVALS: ReadonlyArray<{ readonly ms: number; readonly literal: string }> = [
  { ms: SECOND, literal: '1 second' },
  { ms: 5 * SECOND, literal: '5 seconds' },
  { ms: 10 * SECOND, literal: '10 seconds' },
  { ms: 30 * SECOND, literal: '30 seconds' },
  { ms: MINUTE, literal: '1 minute' },
  { ms: 5 * MINUTE, literal: '5 minutes' },
  { ms: 10 * MINUTE, literal: '10 minutes' },
  { ms: 30 * MINUTE, literal: '30 minutes' },
  { ms: HOUR, literal: '1 hour' },
  { ms: 3 * HOUR, literal: '3 hours' },
  { ms: 12 * HOUR, literal: '12 hours' },
  { ms: DAY, literal: '1 day' },
  { ms: 7 * DAY, literal: '1 week' },
  { ms: 30 * DAY, literal: '1 month' },
  { ms: 365 * DAY, literal: '1 year' },
];

/** Picks the smallest interval that keeps the histogram near the target bucket count. */
export function pickInterval(rangeMs: number): { ms: number; literal: string } {
  return (
    INTERVALS.find(({ ms }) => rangeMs / ms <= TARGET_BUCKETS) ?? INTERVALS[INTERVALS.length - 1]
  );
}
