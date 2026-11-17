/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DeliverySeriesView,
  DestinationFailedView,
} from '../../services/unit_stats_client/types';

/*
 * TEMPORARY, to be removed. The stats API does not send a delivery series yet, so the chart of the
 * flyout has nothing to draw. This makes up counts per bucket, shaped by the real percentages of
 * the destination, so the layout can be designed. IT IS NOT DATA, and it must not ship: delete this
 * file and its caller when the API sends `series`, and show no chart if one is missing then.
 */

const PLACEHOLDER_POINTS = 30;
const PLACEHOLDER_BUCKET_MS = 2 * 60_000;
const PLACEHOLDER_ITEMS_PER_BUCKET = 400;

/** A small repeatable pseudo-random number in [0, 1), so the same input draws the same chart. */
const seeded = (seed: number) => {
  let state = Math.floor(Math.abs(seed) * 1000) % 2147483647 || 1;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
};

/**
 * Counts for the last hour in buckets of two minutes. Each class rises towards its real percentage
 * over the window, as when a credential has just been revoked, and the rest was delivered.
 */
export const placeholderDeliverySeries = ({
  failed,
  endMs = Date.now(),
}: {
  failed: DestinationFailedView;
  endMs?: number;
}): DeliverySeriesView => {
  const random = seeded(failed.authentication.percentage ?? failed.authorization.percentage ?? 1);
  const unit = failed.authentication.unit;
  const startMs = endMs - PLACEHOLDER_POINTS * PLACEHOLDER_BUCKET_MS;
  const share = (percentage: number | null, progress: number) =>
    ((percentage ?? 0) / 100) * Math.min(1, progress * 1.6);

  return {
    bucketMs: PLACEHOLDER_BUCKET_MS,
    unit,
    window: { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() },
    points: Array.from({ length: PLACEHOLDER_POINTS }, (_, index) => {
      const progress = index / (PLACEHOLDER_POINTS - 1);
      const total = Math.round(PLACEHOLDER_ITEMS_PER_BUCKET * (0.8 + random() * 0.4));
      const authentication = Math.round(
        total * share(failed.authentication.percentage, progress) * (0.85 + random() * 0.3)
      );
      const authorization = Math.round(
        total * share(failed.authorization.percentage, progress) * (0.85 + random() * 0.3)
      );
      // Failures of other causes: what the total failed percentage has beyond the two classes.
      const otherPercentage = Math.max(
        0,
        (failed.total.percentage ?? 0) -
          (failed.authentication.percentage ?? 0) -
          (failed.authorization.percentage ?? 0)
      );
      const other = Math.round(total * share(otherPercentage, progress));

      return {
        start: new Date(startMs + index * PLACEHOLDER_BUCKET_MS).toISOString(),
        total,
        failed: Math.min(total, authentication + authorization + other),
        authentication,
        authorization,
      };
    }),
  };
};

/** The failures with a made-up delivery series, unless it has one. */
export const withPlaceholderDeliverySeries = (
  failed: DestinationFailedView,
  endMs?: number
): DestinationFailedView =>
  failed.series === undefined
    ? { ...failed, series: placeholderDeliverySeries({ failed, endMs }) }
    : failed;
