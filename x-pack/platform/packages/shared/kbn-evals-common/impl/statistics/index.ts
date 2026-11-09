/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { pairScores, resolveDirection, isImproved } from './pairing';
export type { PairedScore, Direction } from './pairing';
export { compareScores } from './compare';
export { runPairedTest } from './run_test';
export type { PairedTestOutcome } from './run_test';
export { selectTest, PARAMETRIC_UPGRADE_MIN_PAIRS, NORMALITY_ALPHA } from './select_test';
export { inferMetricType } from './metric_type';
export type { MetricType } from './metric_type';
