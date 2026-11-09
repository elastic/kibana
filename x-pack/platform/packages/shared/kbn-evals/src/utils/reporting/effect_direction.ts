/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isImproved } from '@kbn/evals-common';
import type { ComparisonResult, PairedScore } from '@kbn/evals-common';

export type EffectSign = -1 | 0 | 1;

export type WithEffectSign<T extends ComparisonResult> = T & {
  /** Sign of `target - baseline` according to the row's own test, when it can differ from the mean. */
  effectSign?: EffectSign;
};

/** How a row moved: `mixed` when the test and the mean disagree on the direction. */
export type EffectDirection = 'improved' | 'worse' | 'unchanged' | 'mixed';

const sliceKey = (datasetId: string, evaluatorName: string): string =>
  `${datasetId}|${evaluatorName}`;

/**
 * `W+ - W-` of the Wilcoxon signed-rank test: zero differences dropped (the `wilcox` zero method
 * used by `compareScores`), ties given their average rank.
 */
export const signedRankSum = (differences: readonly number[]): number => {
  const nonZero = differences.filter((difference) => difference !== 0);
  const sorted = nonZero
    .map((difference) => ({ difference, magnitude: Math.abs(difference) }))
    .sort((a, b) => a.magnitude - b.magnitude);

  let sum = 0;
  let start = 0;
  while (start < sorted.length) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1].magnitude === sorted[start].magnitude) {
      end += 1;
    }
    const averageRank = (start + end) / 2 + 1;
    for (let i = start; i <= end; i++) {
      sum += Math.sign(sorted[i].difference) * averageRank;
    }
    start = end + 1;
  }
  return sum;
};

/**
 * The Wilcoxon test is rank-based, so a few large drops can lower the mean while most pairs
 * improve (or the reverse). Attaches the direction the test itself measured. McNemar and the
 * paired t-test need nothing: their direction is the sign of the mean difference.
 */
export const attachEffectSigns = <T extends ComparisonResult>(
  results: readonly T[],
  pairs: readonly PairedScore[]
): Array<WithEffectSign<T>> => {
  const differencesBySlice = new Map<string, number[]>();
  for (const pair of pairs) {
    const key = sliceKey(pair.datasetId, pair.evaluatorName);
    const differences = differencesBySlice.get(key) ?? [];
    differences.push(pair.scoreTarget - pair.scoreBaseline);
    differencesBySlice.set(key, differences);
  }

  return results.map((result) => {
    if (result.hypothesisTest.id !== 'wilcoxon_signed_rank') return result;
    const differences = differencesBySlice.get(sliceKey(result.datasetId, result.evaluatorName));
    if (!differences) return result;
    return { ...result, effectSign: Math.sign(signedRankSum(differences)) as EffectSign };
  });
};

export const getEffectDirection = (result: WithEffectSign<ComparisonResult>): EffectDirection => {
  if (result.direction === 'neutral') return 'unchanged';
  const meanSign = Math.sign(result.meanTarget - result.meanBaseline);
  const testSign = result.effectSign ?? meanSign;
  if (testSign !== meanSign) return 'mixed';
  if (testSign === 0) return 'unchanged';
  return isImproved(testSign, result.direction) ? 'improved' : 'worse';
};
