/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult, PairedScore } from '@kbn/evals-common';
import { groupDifferences, sliceKey } from './wilcoxon_ties';

export type WithIdenticalPairs<T extends ComparisonResult> = T & {
  /**
   * True when every paired difference in the row is zero. Equal means do not imply this: +0.2 and
   * -0.2 average out. Paired tests have no p-value on all-zero differences, so the flag is what
   * tells "nothing changed" apart from "could not be tested".
   */
  allPairsIdentical?: boolean;
};

/** Differences are rounded to 1e-9 first, so averaged repetitions do not fail on roundoff. */
export const attachIdenticalPairs = <T extends ComparisonResult>(
  results: readonly T[],
  pairs: readonly PairedScore[]
): Array<WithIdenticalPairs<T>> => {
  const differencesBySlice = groupDifferences(pairs);

  return results.map((result) => {
    const differences = differencesBySlice.get(sliceKey(result.datasetId, result.evaluatorName));
    if (!differences || differences.length === 0) return result;
    return { ...result, allPairsIdentical: differences.every((difference) => difference === 0) };
  });
};
