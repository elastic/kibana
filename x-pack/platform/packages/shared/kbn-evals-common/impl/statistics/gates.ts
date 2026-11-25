/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '../schemas/experiments/compare_experiments_route.gen';

export type GateVerdict = 'pass' | 'warn' | 'fail';

export interface RegressionGateThresholds {
  /**
   * Worse-direction change in the slice mean, as a fraction of the baseline mean, at
   * which the slice fails — but only together with statistical significance, so a large
   * swing on a noisy slice does not fail on its own.
   */
  failRelativeChange: number;
  /** Worse-direction fractional change at which the slice warns, significant or not. */
  warnRelativeChange: number;
  /** Significance level a change must also meet to fail (p-value of the paired test). */
  alpha: number;
}

export interface RegressionGateConfig {
  defaults: RegressionGateThresholds;
  /** Per-evaluator overrides, keyed by evaluator name as it appears in the scores. */
  evaluators?: Record<string, Partial<RegressionGateThresholds>>;
}

/**
 * Starting values from the regression-evals design: to be tuned once the noise floor of
 * the suite is measured, which is why a gates JSON file can override them per run.
 */
export const DEFAULT_REGRESSION_GATES: RegressionGateConfig = {
  defaults: {
    failRelativeChange: 0.15,
    warnRelativeChange: 0.08,
    alpha: 0.05,
  },
};

export interface GateResult {
  datasetId: string;
  datasetName: string;
  evaluatorName: string;
  verdict: GateVerdict;
  /**
   * Worse-direction change as a fraction of the baseline mean: positive means the target
   * regressed, negative means it improved. Null when the slice cannot be gated (neutral
   * direction, or a zero baseline mean that no change can be relative to).
   */
  relativeChange: number | null;
  pValue: number | null;
  reason: string;
}

export interface RegressionGateReport {
  /** The worst slice verdict: `fail` means a regression was detected. */
  verdict: GateVerdict;
  results: GateResult[];
  regressions: GateResult[];
  warnings: GateResult[];
}

const formatPercent = (fraction: number): string =>
  `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%`;

const gateSlice = (
  result: ComparisonResult,
  thresholds: RegressionGateThresholds
): Pick<GateResult, 'verdict' | 'relativeChange' | 'reason'> => {
  if (result.direction === 'neutral') {
    return {
      verdict: 'pass',
      relativeChange: null,
      reason: 'not comparable across runs (neutral direction)',
    };
  }

  const worseChange =
    result.direction === 'maximize'
      ? result.baseline.mean - result.target.mean
      : result.target.mean - result.baseline.mean;

  // Improvements are reported by the comparison itself, never gated.
  if (worseChange <= 0) {
    return { verdict: 'pass', relativeChange: null, reason: 'no worse-direction change' };
  }

  if (result.baseline.mean === 0) {
    // Any worsening from a zero baseline is unbounded in relative terms; flag it, but
    // never fail on it since the threshold has nothing to be relative to.
    return {
      verdict: 'warn',
      relativeChange: null,
      reason: 'worsened from a zero baseline mean',
    };
  }

  const relativeChange = worseChange / Math.abs(result.baseline.mean);
  const significant = result.pValue != null && result.pValue < thresholds.alpha;

  if (relativeChange >= thresholds.failRelativeChange && significant) {
    return {
      verdict: 'fail',
      relativeChange,
      reason: `worsened ${formatPercent(relativeChange)} (p=${result.pValue?.toFixed(4)})`,
    };
  }
  if (relativeChange >= thresholds.warnRelativeChange || significant) {
    return {
      verdict: 'warn',
      relativeChange,
      reason: significant
        ? `significant worsening of ${formatPercent(relativeChange)} (p=${result.pValue?.toFixed(
            4
          )})`
        : `worsened ${formatPercent(relativeChange)} without significance`,
    };
  }
  return { verdict: 'pass', relativeChange, reason: 'within thresholds' };
};

/**
 * Applies regression gates to paired comparison results, one gate per (dataset,
 * evaluator) slice, and reports the worst verdict. Failing requires both the practical
 * threshold and significance, so neither noise nor a trivial-but-significant change
 * fails a run on its own.
 */
export function evaluateRegressionGates(
  results: ComparisonResult[],
  config: RegressionGateConfig = DEFAULT_REGRESSION_GATES
): RegressionGateReport {
  const gateResults = results.map((result): GateResult => {
    const thresholds: RegressionGateThresholds = {
      ...config.defaults,
      ...config.evaluators?.[result.evaluatorName],
    };
    return {
      datasetId: result.datasetId,
      datasetName: result.datasetName,
      evaluatorName: result.evaluatorName,
      pValue: result.pValue,
      ...gateSlice(result, thresholds),
    };
  });

  const regressions = gateResults.filter(({ verdict }) => verdict === 'fail');
  const warnings = gateResults.filter(({ verdict }) => verdict === 'warn');

  return {
    verdict: regressions.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass',
    results: gateResults,
    regressions,
    warnings,
  };
}
