/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Interval, StringInterval } from '../types';

/**
 * Finds the overlapping portion of two intervals, if any.
 *
 * @param interval1 - The first interval.
 * @param interval2 - The second interval.
 * @returns The overlapping interval if it exists, otherwise null.
 *
 * @example
 * const i1: Interval = { gte: new Date('2023-10-19T12:00:00Z'), lte: new Date('2023-10-19T12:30:00Z') };
 * const i2: Interval = { gte: new Date('2023-10-19T12:15:00Z'), lte: new Date('2023-10-19T12:45:00Z') };
 * Overlap: 12:15 - 12:30
 * const overlap = getOverlap(i1, i2);
 * overlap = { gte: 2023-10-19T12:15:00Z, lte: 2023-10-19T12:30:00Z }
 */
export const getOverlap = (interval1: Interval, interval2: Interval): Interval | null => {
  const start = new Date(Math.max(interval1.gte.getTime(), interval2.gte.getTime()));
  const end = new Date(Math.min(interval1.lte.getTime(), interval2.lte.getTime()));
  return start <= end ? { gte: start, lte: end } : null;
};

/**
 * Merges a list of possibly overlapping intervals into a minimal set of non-overlapping intervals.
 *
 * @param intervals - An array of intervals to merge.
 * @returns A new array of merged intervals with no overlaps.
 *
 * @example
 * const intervals: Interval[] = [
 *   { gte: new Date('2023-10-19T12:00:00Z'), lte: new Date('2023-10-19T12:10:00Z') },
 *   { gte: new Date('2023-10-19T12:05:00Z'), lte: new Date('2023-10-19T12:15:00Z') }
 * ];
 * // Merge into one interval: 12:00 - 12:15
 * const merged = mergeIntervals(intervals);
 * // merged = [{ gte: 2023-10-19T12:00:00Z, lte: 2023-10-19T12:15:00Z }]
 */
export const mergeIntervals = (intervals: Interval[]): Interval[] => {
  if (!intervals.length) return [];

  const sorted = intervals
    .map((interval) => ({ ...interval }))
    .sort((a, b) => a.gte.getTime() - b.gte.getTime());

  return sorted.reduce((merged, current, index) => {
    if (index === 0) {
      merged.push(current);
      return merged;
    }

    const last = merged[merged.length - 1];
    if (last.lte.getTime() >= current.gte.getTime()) {
      // Overlapping, merge intervals by extending the last interval's end time
      last.lte = new Date(Math.max(last.lte.getTime(), current.lte.getTime()));
    } else {
      // No overlap, just add the current interval
      merged.push(current);
    }
    return merged;
  }, [] as Interval[]);
};

/**
 * Subtracts a list of intervals from a single base interval, returning any remaining parts that do not overlap.
 *
 * @param base - The base interval.
 * @param intervalsToSubtract - Intervals to remove from the base.
 * @returns An array of intervals representing the remainder of the base interval.
 *
 * @example
 * const base: Interval = { gte: new Date('2023-10-19T12:00:00Z'), lte: new Date('2023-10-19T13:00:00Z') };
 * const toSubtract: Interval[] = [{ gte: new Date('2023-10-19T12:20:00Z'), lte: new Date('2023-10-19T12:30:00Z') }];
 * // Result splits the base into two: 12:00-12:20 and 12:30-13:00
 * const result = subtractIntervals(base, toSubtract);
 * // result = [
 * //   { gte: 2023-10-19T12:00:00Z, lte: 2023-10-19T12:20:00Z },
 * //   { gte: 2023-10-19T12:30:00Z, lte: 2023-10-19T13:00:00Z }
 * // ]
 */
export const subtractIntervals = (base: Interval, intervalsToSubtract: Interval[]): Interval[] => {
  let result: Interval[] = [base];
  for (const toSubtract of intervalsToSubtract) {
    result = result.flatMap((current) => {
      const overlap = getOverlap(current, toSubtract);
      if (!overlap) return [current];

      const remainder: Interval[] = [];
      const currentStart = current.gte.getTime();
      const currentEnd = current.lte.getTime();
      const overlapStart = overlap.gte.getTime();
      const overlapEnd = overlap.lte.getTime();

      if (overlapStart > currentStart) {
        remainder.push({ gte: new Date(currentStart), lte: new Date(overlapStart) });
      }

      if (overlapEnd < currentEnd) {
        remainder.push({ gte: new Date(overlapEnd), lte: new Date(currentEnd) });
      }

      return remainder;
    });
  }
  return result;
};

/**
 * Applies subtractIntervals to each interval in an array and merges the result,
 * effectively removing intervalsToSubtract from all given intervals.
 *
 * @param intervals - The original intervals from which to subtract.
 * @param intervalsToSubtract - The intervals to remove.
 * @returns An array of intervals representing what remains after all subtractions.
 *
 * @example
 * const intervals: Interval[] = [
 *   { gte: new Date('2023-10-19T12:00:00Z'), lte: new Date('2023-10-19T12:30:00Z') },
 *   { gte: new Date('2023-10-19T12:40:00Z'), lte: new Date('2023-10-19T13:00:00Z') }
 * ];
 * const toSubtract: Interval[] = [{ gte: new Date('2023-10-19T12:20:00Z'), lte: new Date('2023-10-19T12:45:00Z') }];
 * // For the first interval: removing 12:20-12:30 leaves 12:00-12:20
 * // For the second interval: removing 12:20-12:45 overlaps partially, leaving 12:45-13:00
 * // After merging, result:
 * // [
 * //   { gte: 2023-10-19T12:00:00Z, lte: 2023-10-19T12:20:00Z },
 * //   { gte: 2023-10-19T12:45:00Z, lte: 2023-10-19T13:00:00Z }
 * // ]
 * const result = subtractAllIntervals(intervals, toSubtract);
 */
export const subtractAllIntervals = (
  intervals: Interval[],
  intervalsToSubtract: Interval[]
): Interval[] => {
  const result: Interval[] = [];
  for (const interval of intervals) {
    const subtracted = subtractIntervals(interval, intervalsToSubtract);
    result.push(...subtracted);
  }
  return mergeIntervals(result);
};

/**
 * Calculates the duration of a single interval in milliseconds.
 *
 * @param interval - The interval.
 * @returns The duration in milliseconds.
 *
 * @example
 * const i: Interval = { gte: new Date('2023-10-19T12:00:00Z'), lte: new Date('2023-10-19T12:10:00Z') };
 * const duration = intervalDuration(i);
 * // duration = 600000 ms (10 minutes)
 */
export const intervalDuration = (interval: Interval): number => {
  return Math.max(0, interval.lte.getTime() - interval.gte.getTime());
};

/**
 * Sums the durations of multiple intervals in milliseconds.
 *
 * @param intervals - An array of intervals.
 * @returns The total combined duration in milliseconds.
 *
 * @example
 * const intervals: Interval[] = [
 *   { gte: new Date('2023-10-19T12:00:00Z'), lte: new Date('2023-10-19T12:10:00Z') },
 *   { gte: new Date('2023-10-19T12:15:00Z'), lte: new Date('2023-10-19T12:20:00Z') }
 * ];
 * // First interval: 10 min, Second interval: 5 min
 * // Total: 15 min = 900000 ms
 * const totalDuration = sumIntervalsDuration(intervals);
 */
export const sumIntervalsDuration = (intervals: Interval[]): number => {
  return intervals.reduce((sum, interval) => sum + intervalDuration(interval), 0);
};

/**
 * Converts a String-based interval into a date-based interval
 * @param interval
 * @returns
 */
export const normalizeInterval = (interval: StringInterval): Interval => {
  const gte = new Date(interval.gte);
  const lte = new Date(interval.lte);
  return { gte, lte };
};

/**
 * Converts a Date-based interval into a string-based interval.
 *
 * @param interval - An Interval with gte and lte as Date objects.
 * @returns A ConstructorInterval with gte and lte as ISO strings.
 */
export const denormalizeInterval = (interval: Interval): StringInterval => {
  return {
    gte: interval.gte.toISOString(),
    lte: interval.lte.toISOString(),
  };
};

/**
 * Clips an interval to ensure it falls within the given boundary range.
 * If there's no overlap, returns null.
 */
export const clipInterval = (interval: Interval, boundary: Interval): Interval | null => {
  const gte = interval.gte.getTime();
  const lte = interval.lte.getTime();
  const boundaryGte = boundary.gte.getTime();
  const boundaryLte = boundary.lte.getTime();

  const clippedGte = Math.max(gte, boundaryGte);
  const clippedLte = Math.min(lte, boundaryLte);

  if (clippedGte >= clippedLte) {
    return null;
  }

  return { gte: new Date(clippedGte), lte: new Date(clippedLte) };
};
