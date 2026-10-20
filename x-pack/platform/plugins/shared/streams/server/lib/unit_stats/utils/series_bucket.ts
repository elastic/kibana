/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_MAX_ROWS, SERIES_MIN_BUCKET_MS, SERIES_TARGET_POINTS } from '../constants';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Same breakpoints as `getMeaningfulBucketMs` in
 * `streams_app/public/util/stream_overview_esql.ts`. The streams plugin cannot depend on
 * `streams_app`, so the rule is copied. Adds the 10 s floor.
 */
export const getSeriesBucketMs = (rangeMs: number): number => {
  const bucketMs = (() => {
    if (rangeMs < 15 * MINUTE_MS) return Math.floor(rangeMs / SERIES_TARGET_POINTS);
    if (rangeMs <= HOUR_MS) return MINUTE_MS;
    if (rangeMs <= 6 * HOUR_MS) return 5 * MINUTE_MS;
    if (rangeMs <= DAY_MS) return 15 * MINUTE_MS;
    if (rangeMs <= 3 * DAY_MS) return HOUR_MS;
    if (rangeMs <= 10 * DAY_MS) return 6 * HOUR_MS;
    return DAY_MS;
  })();
  return Math.max(bucketMs, SERIES_MIN_BUCKET_MS);
};

/**
 * How many ids one series query can ask for, so that its rows (ids times buckets) stay within
 * `ESQL_MAX_ROWS`. The first and last buckets can be partial, so the window covers one more
 * bucket than its length divided by the bucket width.
 */
export const getIdsPerSeriesQuery = ({
  rangeMs,
  bucketMs,
}: {
  rangeMs: number;
  bucketMs: number;
}): number => Math.max(1, Math.floor(ESQL_MAX_ROWS / (Math.ceil(rangeMs / bucketMs) + 1)));
