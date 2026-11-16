/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mean, pairedTable } from '@elastic/statistics';
import type {
  ComparisonResult,
  HypothesisTest,
} from '../schemas/experiments/compare_experiments_route.gen';
import { resolveDirection } from './pairing';
import type { PairedScore } from './pairing';
import { runPairedTest } from './run_test';
import { selectTest } from './select_test';

function groupByDatasetAndEvaluator(pairs: PairedScore[]): PairedScore[][] {
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
  return [...groups.values()];
}

function compareSlice(group: PairedScore[]): ComparisonResult {
  const target = group.map((pair) => pair.scoreTarget);
  const baseline = group.map((pair) => pair.scoreBaseline);

  const sampleSize = group.length;

  const { metricType, testId } = selectTest(target, baseline);
  const outcome = runPairedTest(testId, target, baseline);

  const hypothesisTest: HypothesisTest = {
    id: outcome.id,
    ...(outcome.method !== undefined && { method: outcome.method }),
    statistic: outcome.statistic,
  };
  if (metricType === 'binary') {
    const [[, targetOnly], [baselineOnly]] = pairedTable(target, baseline);
    hypothesisTest.discordantPairs = { targetOnly, baselineOnly };
  }

  const direction =
    group.find((pair) => pair.direction !== undefined)?.direction ??
    resolveDirection(undefined, undefined, group[0].evaluatorName);

  return {
    datasetId: group[0].datasetId,
    datasetName: group[0].datasetName,
    evaluatorName: group[0].evaluatorName,
    sampleSize,
    meanTarget: mean(target),
    meanBaseline: mean(baseline),
    pValue: outcome.pValue,
    direction,
    metricType,
    hypothesisTest,
  };
}

/**
 * Run a paired statistical test per (dataset, evaluator) slice of the given pairs. The test is
 * chosen per slice by `selectTest` from the inferred metric type and the observed scores.
 */
export function compareScores(pairs: PairedScore[]): ComparisonResult[] {
  return groupByDatasetAndEvaluator(pairs).map(compareSlice);
}
