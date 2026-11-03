/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shapiroWilk } from '@elastic/statistics';
import type {
  MetricType,
  StatisticalTestId,
} from '../schemas/experiments/compare_experiments_route.gen';
import { inferMetricType } from './metric_type';

/** Minimum pairs before a continuous metric may use the paired t-test instead of Wilcoxon. */
export const PARAMETRIC_UPGRADE_MIN_PAIRS = 30;
/** Shapiro-Wilk p-value above which the paired differences are treated as normal. */
export const NORMALITY_ALPHA = 0.05;

const isNormal = (differences: number[]): boolean => {
  const { pValue } = shapiroWilk(differences);
  return pValue !== null && pValue > NORMALITY_ALPHA;
};

/**
 * Pick the paired test from its metric type and observed scores.
 */
export function selectTest(
  target: number[],
  baseline: number[]
): { metricType: MetricType; testId: StatisticalTestId } {
  const metricType = inferMetricType(target, baseline) ?? 'continuous_bounded';
  if (metricType === 'binary') {
    return { metricType, testId: 'mcnemar' };
  }

  const isContinuous = metricType === 'continuous_bounded' || metricType === 'continuous_unbounded';
  if (isContinuous && target.length >= PARAMETRIC_UPGRADE_MIN_PAIRS) {
    const differences = target.map((value, index) => value - baseline[index]);
    if (isNormal(differences)) {
      return { metricType, testId: 'paired_t' };
    }
  }

  return { metricType, testId: 'wilcoxon_signed_rank' };
}
