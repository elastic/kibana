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
export {
  holmBonferroniAdjust,
  countHolmFamily,
  applyHolmCorrection,
  getEffectivePValue,
} from './holm_correction';
export type { CorrectableComparisonResult } from './holm_correction';
export { averageMatchedRepetitions } from './average_repetitions';
export type { AveragedRepetitions } from './average_repetitions';
export { retestWilcoxonWithExactTies, roundDifference } from './wilcoxon_ties';
export { minimumReachablePValue } from './reachable_p_value';
export { attachEffectSigns, getEffectDirection, signedRankSum } from './effect_direction';
export type { EffectSign, EffectDirection, WithEffectSign } from './effect_direction';
