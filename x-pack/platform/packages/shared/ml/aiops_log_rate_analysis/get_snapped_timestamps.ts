/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates an array of timestamps evenly spaced within a given time range.
 *
 * @param timeRangeEarliest The earliest timestamp in the time range.
 * @param timeRangeLatest The latest timestamp in the time range.
 * @param interval The interval between timestamps in milliseconds.
 * @returns Array of timestamps spaced by the specified interval within the given range.
 */
export const getSnappedTimestamps = (
  timeRangeEarliest: number,
  timeRangeLatest: number,
  interval: number
) => {
  const timestamps: number[] = [];
  let n = timeRangeEarliest;

  while (n <= timeRangeLatest + interval) {
    timestamps.push(n);
    n += interval;
  }

  return timestamps;
};
