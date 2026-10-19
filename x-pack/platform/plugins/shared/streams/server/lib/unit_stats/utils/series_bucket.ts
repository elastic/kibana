/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERIES_MIN_BUCKET_MS, SERIES_TARGET_POINTS } from '../constants';

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
