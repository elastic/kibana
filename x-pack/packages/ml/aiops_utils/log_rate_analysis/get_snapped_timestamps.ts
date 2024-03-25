/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
