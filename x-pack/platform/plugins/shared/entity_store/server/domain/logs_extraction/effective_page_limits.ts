/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LOG_EXTRACTION_SAMPLE_PROBABILITY,
  roundSampleProbability,
} from './log_pagination_probe_query_builder';

/**
 * Returns the effective per-page log limit: when `maxLogsPerWindow` is active (> 0),
 * the page size is capped so a single probe never requests more logs than the remaining
 * run budget. When `maxLogsPerWindow` is 0 (disabled), `value` is returned unchanged.
 */
export const capAtMaxLogsPerWindow = (value: number, maxLogsPerWindow: number): number =>
  maxLogsPerWindow > 0 ? Math.min(value, maxLogsPerWindow) : value;

/**
 * Minimum number of retained (sampled) rows needed for the probe's accuracy guarantee to hold —
 * relative boundary error ≈ 1/√k. See `probe_benchmark/report.html` ("Choosing the sampling
 * probability p") for the validation behind this value.
 */
export const LOG_EXTRACTION_SAMPLE_MIN_RETAINED = 2500;

/**
 * Adaptive sampling probability for the log-pagination probe: keeps the expected number of
 * retained rows (`k = p · maxLogsPerPage`) at or above `minRetained` by raising `p` above
 * `targetProbability` as `maxLogsPerPage` shrinks — up to `p = 1` (an exact, unsampled probe)
 * once `maxLogsPerPage` is small enough that sampling can't reliably help. Never goes below
 * `targetProbability`, so large pages keep the full validated speedup.
 */
export const pickSampleProbability = (
  maxLogsPerPage: number,
  targetProbability: number = LOG_EXTRACTION_SAMPLE_PROBABILITY,
  minRetained: number = LOG_EXTRACTION_SAMPLE_MIN_RETAINED
): number =>
  roundSampleProbability(Math.min(1, Math.max(targetProbability, minRetained / maxLogsPerPage)));
