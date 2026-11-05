/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isImproved } from '@kbn/evals-common';
import type { ComparisonResult } from '@kbn/evals-common';
import { getEffectivePValue } from './holm_correction';
import type { CorrectableComparisonResult } from './holm_correction';
import { getTestLabel } from './test_label';

export const DEFAULT_REGRESSION_SIGNIFICANCE_THRESHOLD = 0.05;
export const DEFAULT_REGRESSION_MIN_PAIRS = 10;

export interface RegressionFinding {
  datasetName: string;
  evaluatorName: string;
  delta: number;
  pValue: number;
  adjustedPValue: number | null;
  effectivePValue: number;
  testId: ComparisonResult['hypothesisTest']['id'];
  sampleSize: number;
}

export interface InsufficientPairsFinding {
  datasetName: string;
  evaluatorName: string;
  sampleSize: number;
}

export interface RegressionGateDecision {
  tripped: boolean;
  regressions: RegressionFinding[];
  insufficientPairs: InsufficientPairsFinding[];
}

const toFinite = (value: number | null | undefined): number | null =>
  value !== null && value !== undefined && Number.isFinite(value) ? value : null;

/**
 * Decides whether a comparison contains a statistically significant change in the worse
 * direction. A row trips the gate only when it is in scope, has at least `minPairs` pairs, has a
 * direction (neutral evaluators cannot regress), moved against that direction, and its effective
 * p-value (Holm-adjusted when a correction was applied) is below `significanceThreshold`.
 *
 * `evaluators` limits which evaluator names are considered; omitted or empty means all.
 */
export const evaluateRegressionGate = ({
  results,
  significanceThreshold = DEFAULT_REGRESSION_SIGNIFICANCE_THRESHOLD,
  minPairs = DEFAULT_REGRESSION_MIN_PAIRS,
  evaluators,
}: {
  results: readonly CorrectableComparisonResult[];
  significanceThreshold?: number;
  minPairs?: number;
  evaluators?: readonly string[];
}): RegressionGateDecision => {
  const scope = evaluators && evaluators.length > 0 ? new Set(evaluators) : undefined;
  const regressions: RegressionFinding[] = [];
  const insufficientPairs: InsufficientPairsFinding[] = [];

  for (const result of results) {
    if (scope && !scope.has(result.evaluatorName)) continue;
    if (result.direction === 'neutral') continue;

    if (result.sampleSize < minPairs) {
      insufficientPairs.push({
        datasetName: result.datasetName,
        evaluatorName: result.evaluatorName,
        sampleSize: result.sampleSize,
      });
      continue;
    }

    const pValue = toFinite(result.pValue);
    const effectivePValue = toFinite(getEffectivePValue(result));
    if (pValue === null || effectivePValue === null) continue;

    const delta = result.meanTarget - result.meanBaseline;
    const isWorse = delta !== 0 && !isImproved(delta, result.direction);
    if (!isWorse || effectivePValue >= significanceThreshold) continue;

    regressions.push({
      datasetName: result.datasetName,
      evaluatorName: result.evaluatorName,
      delta,
      pValue,
      adjustedPValue: toFinite(result.adjustedPValue),
      effectivePValue,
      testId: result.hypothesisTest.id,
      sampleSize: result.sampleSize,
    });
  }

  return { tripped: regressions.length > 0, regressions, insufficientPairs };
};

const formatP = (value: number): string => (value < 0.001 ? '<0.001' : value.toFixed(3));

const formatDelta = (value: number): string =>
  value > 0 ? `+${value.toFixed(3)}` : value.toFixed(3);

/** Concise, line-per-regression summary for the failure message. */
export const formatRegressionGateReport = ({
  decision,
  minPairs = DEFAULT_REGRESSION_MIN_PAIRS,
  significanceThreshold = DEFAULT_REGRESSION_SIGNIFICANCE_THRESHOLD,
}: {
  decision: RegressionGateDecision;
  minPairs?: number;
  significanceThreshold?: number;
}): string => {
  const lines: string[] = [];

  if (decision.tripped) {
    lines.push(
      `Regression gate tripped: ${decision.regressions.length} evaluator(s) got significantly worse (p < ${significanceThreshold}).`
    );
    for (const finding of decision.regressions) {
      const adjusted =
        finding.adjustedPValue === null ? '' : `, adjusted p=${formatP(finding.adjustedPValue)}`;
      lines.push(
        `  - ${finding.datasetName} / ${finding.evaluatorName}: delta ${formatDelta(
          finding.delta
        )}, p=${formatP(finding.pValue)}${adjusted}, ${getTestLabel(finding.testId)}, n=${
          finding.sampleSize
        } pairs`
      );
    }
  } else {
    lines.push('Regression gate passed: no evaluator got significantly worse.');
  }

  if (decision.insufficientPairs.length > 0) {
    lines.push(
      `Warning: ${decision.insufficientPairs.length} evaluator(s) have fewer than ${minPairs} pairs and were NOT checked for regressions:`
    );
    for (const finding of decision.insufficientPairs) {
      lines.push(
        `  - ${finding.datasetName} / ${finding.evaluatorName}: insufficient pairs (n=${finding.sampleSize})`
      );
    }
  }

  return lines.join('\n');
};
