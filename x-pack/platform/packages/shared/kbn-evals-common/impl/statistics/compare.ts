/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pairedT } from '@elastic/statistics';
import type { EvaluationScoreDocument } from '../schemas/common_attributes.gen';
import type { PairedTTestResult } from '../schemas/experiments/compare_experiments_route.gen';
import { mean, pairScores, resolveDirection } from './pairing';
import type { PairedScore } from './pairing';

/**
 * Compute paired t-test results grouped by dataset and evaluator.
 * Accepts either raw score documents (which are paired internally)
 * or pre-computed pairs to avoid duplicate pairing work.
 */
export function computePairedTTestResults(pairs: PairedScore[]): PairedTTestResult[];
export function computePairedTTestResults(
  targetScores: EvaluationScoreDocument[],
  baselineScores: EvaluationScoreDocument[]
): PairedTTestResult[];
export function computePairedTTestResults(
  targetScoresOrPairs: EvaluationScoreDocument[] | PairedScore[],
  baselineScores?: EvaluationScoreDocument[]
): PairedTTestResult[] {
  const pairs: PairedScore[] =
    baselineScores !== undefined
      ? pairScores(targetScoresOrPairs as EvaluationScoreDocument[], baselineScores).pairs
      : (targetScoresOrPairs as PairedScore[]);

  const groups = new Map<string, PairedScore[]>();
  for (const pair of pairs) {
    const key = `${pair.datasetId}|${pair.evaluatorName}`;
    const group = groups.get(key);
    if (group) {
      group.push(pair);
    } else {
      groups.set(key, [pair]);
    }
  }

  const results: PairedTTestResult[] = [];
  for (const group of groups.values()) {
    const groupTargetScores = group.map((pair) => pair.scoreTarget);
    const groupBaselineScores = group.map((pair) => pair.scoreBaseline);

    // Two-tailed paired t-test; `pValue` is null when fewer than two pairs are available.
    const { pValue } = pairedT(groupTargetScores, groupBaselineScores);

    const direction =
      group.find((pair) => pair.direction !== undefined)?.direction ??
      resolveDirection(undefined, undefined, group[0].evaluatorName);

    results.push({
      datasetId: group[0].datasetId,
      datasetName: group[0].datasetName,
      evaluatorName: group[0].evaluatorName,
      sampleSize: group.length,
      meanTarget: mean(groupTargetScores),
      meanBaseline: mean(groupBaselineScores),
      pValue,
      direction,
    });
  }

  return results;
}
