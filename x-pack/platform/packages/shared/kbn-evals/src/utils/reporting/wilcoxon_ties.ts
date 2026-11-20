/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wilcoxonSignedRank } from '@elastic/statistics';
import type { ComparisonResult, PairedScore } from '@kbn/evals-common';

const DIFFERENCE_GRID = 1e9;

/**
 * Rounds a paired difference to 1e-9 so roundoff does not split ties. Averaged repetitions give
 * thirds and the like: `1 - 2/3` and `1/3 - 0` differ in the last bit, and the signed-rank test
 * would rank them as distinct values.
 */
export const roundDifference = (difference: number): number =>
  Math.round(difference * DIFFERENCE_GRID) / DIFFERENCE_GRID;

export const sliceKey = (datasetId: string, evaluatorName: string): string =>
  `${datasetId}|${evaluatorName}`;

export const groupDifferences = (pairs: readonly PairedScore[]): Map<string, number[]> => {
  const differencesBySlice = new Map<string, number[]>();
  for (const pair of pairs) {
    const key = sliceKey(pair.datasetId, pair.evaluatorName);
    const differences = differencesBySlice.get(key) ?? [];
    differences.push(roundDifference(pair.scoreTarget - pair.scoreBaseline));
    differencesBySlice.set(key, differences);
  }
  return differencesBySlice;
};

/**
 * Re-runs every Wilcoxon row on rounded differences, so tied differences get tied ranks. Same
 * package defaults as the shared comparison (two-sided, `wilcox` zero method, `auto` method).
 */
export const retestWilcoxonWithExactTies = <T extends ComparisonResult>(
  results: readonly T[],
  pairs: readonly PairedScore[]
): T[] => {
  const differencesBySlice = groupDifferences(pairs);
  return results.map((result) => {
    if (result.hypothesisTest.id !== 'wilcoxon_signed_rank') return result;
    const differences = differencesBySlice.get(sliceKey(result.datasetId, result.evaluatorName));
    if (!differences) return result;

    const { statistic, pValue, zStatistic } = wilcoxonSignedRank(
      differences,
      differences.map(() => 0)
    );
    return {
      ...result,
      pValue,
      hypothesisTest: {
        id: result.hypothesisTest.id,
        ...(pValue !== null && { method: zStatistic !== null ? 'asymptotic' : 'exact' }),
        statistic,
      },
    };
  });
};
