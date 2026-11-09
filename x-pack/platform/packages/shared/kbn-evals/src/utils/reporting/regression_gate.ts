/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '@kbn/evals-common';
import { getEffectDirection } from './effect_direction';
import type { WithEffectSign } from './effect_direction';
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

export interface UntestableFinding {
  datasetName: string;
  evaluatorName: string;
  sampleSize: number;
}

export interface DirectionConflictFinding {
  datasetName: string;
  evaluatorName: string;
  delta: number;
  effectivePValue: number;
  sampleSize: number;
}

export type RegressionGateStatus = 'passed' | 'tripped' | 'inconclusive';

export interface RegressionGateDecision {
  /** `tripped` when a regression was found, `inconclusive` when no row could be checked at all. */
  status: RegressionGateStatus;
  tripped: boolean;
  /** Rows that were actually tested: in scope, directional, enough pairs and a usable p-value. */
  checked: number;
  regressions: RegressionFinding[];
  insufficientPairs: InsufficientPairsFinding[];
  /** Rows with enough pairs but a null or non-finite p-value, so no test result to judge. */
  untestable: UntestableFinding[];
  /** Significant rows whose rank-based test and mean difference point in opposite directions. */
  directionConflicts: DirectionConflictFinding[];
}

const toFinite = (value: number | null | undefined): number | null =>
  value !== null && value !== undefined && Number.isFinite(value) ? value : null;

/**
 * A row trips the gate when it is in scope, directional, has at least `minPairs` pairs, its test
 * measured a change in the worse direction, and its effective (Holm-adjusted when applied)
 * p-value is below `significanceThreshold`. Significant rows where the test and the mean
 * disagree on the direction cannot trip and are not counted as checked. With no checked row the
 * status is `inconclusive`, never `passed`.
 */
export const evaluateRegressionGate = ({
  results,
  significanceThreshold = DEFAULT_REGRESSION_SIGNIFICANCE_THRESHOLD,
  minPairs = DEFAULT_REGRESSION_MIN_PAIRS,
  evaluators,
}: {
  results: ReadonlyArray<WithEffectSign<CorrectableComparisonResult>>;
  significanceThreshold?: number;
  minPairs?: number;
  evaluators?: readonly string[];
}): RegressionGateDecision => {
  const scope = evaluators && evaluators.length > 0 ? new Set(evaluators) : undefined;
  const regressions: RegressionFinding[] = [];
  const insufficientPairs: InsufficientPairsFinding[] = [];
  const untestable: UntestableFinding[] = [];
  const directionConflicts: DirectionConflictFinding[] = [];
  let checked = 0;

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
    if (pValue === null || effectivePValue === null) {
      untestable.push({
        datasetName: result.datasetName,
        evaluatorName: result.evaluatorName,
        sampleSize: result.sampleSize,
      });
      continue;
    }

    const delta = result.meanTarget - result.meanBaseline;
    const isSignificant = effectivePValue < significanceThreshold;
    const effect = getEffectDirection(result);
    if (isSignificant && effect === 'mixed') {
      directionConflicts.push({
        datasetName: result.datasetName,
        evaluatorName: result.evaluatorName,
        delta,
        effectivePValue,
        sampleSize: result.sampleSize,
      });
      continue;
    }

    checked += 1;
    if (!isSignificant || effect !== 'worse') continue;

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

  const tripped = regressions.length > 0;
  const status: RegressionGateStatus = tripped
    ? 'tripped'
    : checked === 0
    ? 'inconclusive'
    : 'passed';

  return {
    status,
    tripped,
    checked,
    regressions,
    insufficientPairs,
    untestable,
    directionConflicts,
  };
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
  } else if (decision.status === 'inconclusive') {
    lines.push(
      'Regression gate inconclusive: no evaluator could be checked, so regressions can be neither confirmed nor ruled out.'
    );
  } else {
    lines.push(
      `Regression gate passed: no evaluator got significantly worse (${decision.checked} evaluator comparison(s) checked).`
    );
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

  if (decision.untestable.length > 0) {
    lines.push(
      `Warning: ${decision.untestable.length} evaluator(s) have no usable p-value and were NOT checked for regressions:`
    );
    for (const finding of decision.untestable) {
      lines.push(
        `  - ${finding.datasetName} / ${finding.evaluatorName}: no usable p-value (n=${finding.sampleSize})`
      );
    }
  }

  if (decision.directionConflicts.length > 0) {
    lines.push(
      `Warning: ${decision.directionConflicts.length} evaluator(s) changed significantly, but the rank test and the mean disagree on the direction (a few large changes against most pairs). They were NOT checked for regressions; inspect them by hand:`
    );
    for (const finding of decision.directionConflicts) {
      lines.push(
        `  - ${finding.datasetName} / ${finding.evaluatorName}: mean delta ${formatDelta(
          finding.delta
        )}, p=${formatP(finding.effectivePValue)}, n=${finding.sampleSize} pairs`
      );
    }
  }

  return lines.join('\n');
};
