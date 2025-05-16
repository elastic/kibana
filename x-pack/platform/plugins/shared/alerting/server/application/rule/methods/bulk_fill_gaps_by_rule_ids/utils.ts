/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Clamps the list `intervals` (in ascending order) to the dates provided in the `range`
 * @param intervals
 * @param range
 * @returns
 */
export const clampIntervalsForScheduling = (
  intervals: Array<{ gte: string; lte: string }>,
  range: { start: string; end: string }
) => {
  const clampedIntervals = [];
  const { start, end } = range;

  for (const { gte, lte } of intervals) {
    // If the interval ends before the range starts, skip it
    if (lte < start) {
      continue;
    }

    // If the interval starts after the range ends, stop processing (since the list is sorted)
    if (gte > end) {
      break;
    }

    const clamped = {
      gte: gte < start ? start : gte,
      lte: lte > end ? end : lte,
    };

    // Atter clamping the intervals the limits cannot be the same
    if (clamped.gte >= clamped.lte) {
      continue;
    }

    // Clamp the interval to the range
    clampedIntervals.push(clamped);
  }

  return clampedIntervals;
};
