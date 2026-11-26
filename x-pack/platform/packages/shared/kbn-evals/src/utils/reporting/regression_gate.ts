/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '@kbn/evals-common';

/** One pre-registered metric whose regression blocks a PR (`regressionGate` in `evals.suites.json`). */
export interface RegressionGateConfig {
  dataset: string;
  evaluator: string;
  minAbsoluteDrop: number;
  alpha: number;
  maxBaselineAgeDays: number;
}

export type RegressionGateState = 'pass' | 'regression' | 'inconclusive';

export interface RegressionGateVerdict {
  state: RegressionGateState;
  summary: string;
}

/** Fewer paired examples than this can't show a regression of a useful size. */
export const MIN_GATE_PAIRED_EXAMPLES = 10;

const DAY_MS = 24 * 60 * 60 * 1000;
// Keeps e.g. 0.3 - 0.2 (0.0999…) from slipping under a 0.1 threshold.
const FLOAT_TOLERANCE = 1e-9;

/** Problems with a gate's thresholds; the same ranges `evals_suites_config.test.ts` enforces. */
export const validateRegressionGateConfig = ({
  alpha,
  minAbsoluteDrop,
  maxBaselineAgeDays,
}: RegressionGateConfig): string[] => [
  ...(alpha > 0 && alpha < 1 ? [] : ['alpha must be in (0, 1)']),
  ...(minAbsoluteDrop > 0 && minAbsoluteDrop <= 1 ? [] : ['min drop must be in (0, 1]']),
  ...(Number.isInteger(maxBaselineAgeDays) && maxBaselineAgeDays > 0
    ? []
    : ['max baseline age must be a positive whole number of days']),
];

export const inconclusiveVerdict = (summary: string): RegressionGateVerdict => ({
  state: 'inconclusive',
  summary,
});

const formatScore = (value: number): string => value.toFixed(2);

const formatPValue = (pValue: number): string =>
  pValue < 0.001 ? 'p<0.001' : `p=${pValue.toFixed(3)}`;

/**
 * Whether the gated metric regressed: worse by at least `minAbsoluteDrop` with p < `alpha`.
 * Anything that keeps the comparison from answering that is `inconclusive`, never a regression.
 */
export const evaluateRegressionGate = ({
  results,
  gate,
  baselineTimestamp,
  now = new Date(),
}: {
  results: ComparisonResult[];
  gate: RegressionGateConfig;
  baselineTimestamp?: string;
  now?: Date;
}): RegressionGateVerdict => {
  const { dataset, evaluator, minAbsoluteDrop, alpha, maxBaselineAgeDays } = gate;

  const baselineTime = baselineTimestamp ? new Date(baselineTimestamp).getTime() : NaN;
  if (!Number.isFinite(baselineTime)) {
    return inconclusiveVerdict('baseline age unknown');
  }
  // Compare the exact age, so 3 days and 23 hours is over a 3-day limit.
  const baselineAgeDays = (now.getTime() - baselineTime) / DAY_MS;
  if (baselineAgeDays > maxBaselineAgeDays) {
    return inconclusiveVerdict(
      `baseline is ${baselineAgeDays.toFixed(1)} days old (limit ${maxBaselineAgeDays})`
    );
  }

  const result = results.find(
    ({ datasetName, evaluatorName }) => datasetName === dataset && evaluatorName === evaluator
  );
  if (!result) {
    return inconclusiveVerdict(`no paired ${evaluator} scores on ${dataset}`);
  }

  const { sampleSize, direction, pValue, target, baseline } = result;
  if (sampleSize < MIN_GATE_PAIRED_EXAMPLES) {
    return inconclusiveVerdict(`only ${sampleSize} paired examples`);
  }
  if (direction === 'neutral') {
    return inconclusiveVerdict(`${evaluator} has no improvement direction`);
  }
  if (pValue === null || !Number.isFinite(pValue)) {
    return inconclusiveVerdict(`significance test could not run for ${evaluator}`);
  }

  const drop = direction === 'maximize' ? baseline.mean - target.mean : target.mean - baseline.mean;
  const change = `${formatScore(baseline.mean)} → ${formatScore(target.mean)}`;

  if (drop >= minAbsoluteDrop - FLOAT_TOLERANCE && pValue < alpha) {
    return { state: 'regression', summary: `${evaluator} ${change} (${formatPValue(pValue)})` };
  }
  return { state: 'pass', summary: `no regression in ${evaluator} (${change})` };
};
