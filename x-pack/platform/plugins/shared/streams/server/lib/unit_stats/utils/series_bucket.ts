/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { boundsDescendingRaw, calcAutoIntervalNear } from '@kbn/data-plugin/common';
import { SERIES_MAX_BUCKETS, SERIES_MIN_BUCKET_MS, SERIES_TARGET_BUCKETS } from '../constants';

/** The widths Discover's auto interval can pick, narrowest first. */
const LADDER_WIDTHS_MS = boundsDescendingRaw
  .map(({ interval }) => Number(interval))
  .sort((a, b) => a - b);

/**
 * The bucket width of a series, picked the way Discover picks its auto interval: the nearest
 * "nice" width for about `SERIES_TARGET_BUCKETS` buckets. When that gives more than
 * `SERIES_MAX_BUCKETS` buckets, the next wider widths are tried, and past the widest one the
 * width that fits exactly is used. A bucket is never narrower than the export interval.
 */
export const getSeriesBucketMs = (rangeMs: number): number => {
  const nearestMs = Number(calcAutoIntervalNear(SERIES_TARGET_BUCKETS, rangeMs));
  const fits = (widthMs: number) => Math.ceil(rangeMs / widthMs) <= SERIES_MAX_BUCKETS;
  const bucketMs =
    LADDER_WIDTHS_MS.find((widthMs) => widthMs >= nearestMs && fits(widthMs)) ??
    Math.ceil(rangeMs / SERIES_MAX_BUCKETS);

  return Math.max(bucketMs, SERIES_MIN_BUCKET_MS);
};
