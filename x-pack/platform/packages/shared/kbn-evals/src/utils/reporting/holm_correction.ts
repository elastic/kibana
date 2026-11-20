/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComparisonResult } from '@kbn/evals-common';
import type { MaybeIdenticalPairs } from './identical_pairs';

/**
 * A comparison row that may carry a multiplicity-adjusted p-value. `undefined` means no
 * correction was applied; `null` means the row had no p-value to adjust.
 */
export type CorrectableComparisonResult = ComparisonResult & {
  adjustedPValue?: number | null;
};

const isUsablePValue = (value: number | null): value is number =>
  value !== null && Number.isFinite(value);

/**
 * Whether a row takes part in the Holm family: it has a finite p-value and its pairs are not all
 * identical. An identical row can never be rejected, so counting it would only inflate the other
 * rows' adjusted p-values. The correction, the family count and the reachable floor all use this.
 */
export const isInHolmFamily = (result: ComparisonResult & MaybeIdenticalPairs): boolean =>
  isUsablePValue(result.pValue) && result.allPairsIdentical !== true;

/**
 * Holm-Bonferroni step-down adjustment. Returns adjusted p-values in the input order, capped at 1.
 * Controls the family-wise error rate without assuming the tests are independent.
 *
 * Non-finite inputs (NaN, +/-Infinity) are not valid p-values: they are left out of the family,
 * so they do not inflate the correction, and come back as NaN at their positions.
 */
export const holmBonferroniAdjust = (pValues: readonly number[]): number[] => {
  const family = pValues
    .map((p, index) => ({ p, index }))
    .filter(({ p }) => Number.isFinite(p))
    .sort((a, b) => a.p - b.p);
  const m = family.length;

  const adjusted = new Array<number>(pValues.length).fill(NaN);
  let runningMax = 0;
  family.forEach(({ p, index }, rank) => {
    runningMax = Math.max(runningMax, Math.min(1, (m - rank) * p));
    adjusted[index] = runningMax;
  });
  return adjusted;
};

/** Number of rows that take part in the Holm family. */
export const countHolmFamily = (
  results: ReadonlyArray<ComparisonResult & MaybeIdenticalPairs>
): number => results.filter(isInHolmFamily).length;

/**
 * Adds `adjustedPValue` to every row. The family is `isInHolmFamily` rows; rows whose test could
 * not run, or whose pairs are all identical, get `null` and do not count towards the family size.
 */
export const applyHolmCorrection = <T extends ComparisonResult & MaybeIdenticalPairs>(
  results: readonly T[]
): Array<T & { adjustedPValue: number | null }> => {
  const usable = results.flatMap((result) =>
    isInHolmFamily(result) ? [{ result, pValue: result.pValue as number }] : []
  );
  const adjusted = holmBonferroniAdjust(usable.map(({ pValue }) => pValue));
  const adjustedByRow = new Map(usable.map(({ result }, i) => [result, adjusted[i]]));

  return results.map((result) => ({
    ...result,
    adjustedPValue: adjustedByRow.get(result) ?? null,
  }));
};

/** The p-value significance should be judged on: adjusted when a correction was applied. */
export const getEffectivePValue = (result: CorrectableComparisonResult): number | null =>
  result.adjustedPValue !== undefined ? result.adjustedPValue : result.pValue;
