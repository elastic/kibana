/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DestinationFailedView,
  FailureClassView,
  FailureSeriesView,
} from '../../services/unit_stats_client/types';

/*
 * TEMPORARY, to be removed. The stats API does not send a series for each failure class yet, so the
 * sparkline on the Map popover has nothing to draw. This makes up a line that ends at the real
 * percentage, so the layout can be designed. IT IS NOT DATA, and it must not ship: delete this file
 * and its caller when the API sends `series`, and show no sparkline if one is missing then.
 */

/** A sparkline has no more than 12 values, so this makes 12: 75 seconds each, 15 minutes in all. */
const PLACEHOLDER_POINTS = 12;
const PLACEHOLDER_BUCKET_MS = 75_000;

export type PlaceholderTrend = 'rising' | 'falling' | 'flat';

/** A small repeatable pseudo-random number in [0, 1), so the same input draws the same line. */
const seeded = (seed: number) => {
  let state = Math.floor(Math.abs(seed) * 1000) % 2147483647 || 1;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
};

/** A line of 12 buckets that ends at `endPercentage` and follows `trend` to get there. */
export const placeholderFailureSeries = ({
  endPercentage,
  trend,
  endMs,
}: {
  endPercentage: number;
  trend: PlaceholderTrend;
  endMs: number;
}): FailureSeriesView => {
  const random = seeded(endPercentage);
  const startPercentage =
    trend === 'rising'
      ? endPercentage * 0.15
      : trend === 'falling'
      ? Math.min(100, endPercentage * 2.2)
      : endPercentage;

  return {
    bucketMs: PLACEHOLDER_BUCKET_MS,
    window: {
      start: new Date(endMs - (PLACEHOLDER_POINTS - 1) * PLACEHOLDER_BUCKET_MS).toISOString(),
      end: new Date(endMs + PLACEHOLDER_BUCKET_MS).toISOString(),
    },
    points: Array.from({ length: PLACEHOLDER_POINTS }, (_, index) => {
      const progress = index / (PLACEHOLDER_POINTS - 1);
      const base = startPercentage + (endPercentage - startPercentage) * progress;
      const noise = (random() - 0.5) * 0.2 * Math.max(endPercentage, 5);
      const isLast = index === PLACEHOLDER_POINTS - 1;
      return {
        start: new Date(
          endMs - (PLACEHOLDER_POINTS - 1 - index) * PLACEHOLDER_BUCKET_MS
        ).toISOString(),
        value: isLast ? endPercentage : Math.min(100, Math.max(0, base + noise)),
      };
    }),
  };
};

const TRENDS: readonly PlaceholderTrend[] = ['rising', 'falling', 'flat'];

const withPlaceholderSeries = (failureClass: FailureClassView, endMs: number): FailureClassView => {
  if (failureClass.series !== undefined || failureClass.percentage === null) return failureClass;
  const { percentage } = failureClass;
  return {
    ...failureClass,
    series: placeholderFailureSeries({
      endPercentage: percentage,
      trend: TRENDS[Math.floor(percentage) % TRENDS.length],
      endMs,
    }),
  };
};

/** The failures with a made-up series on each class that has a percentage and no series. */
export const withPlaceholderFailureSeries = (
  failed: DestinationFailedView,
  endMs: number = Date.now()
): DestinationFailedView => ({
  ...failed,
  authentication: withPlaceholderSeries(failed.authentication, endMs),
  authorization: withPlaceholderSeries(failed.authorization, endMs),
});
