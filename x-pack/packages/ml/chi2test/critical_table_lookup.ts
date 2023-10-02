/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CRITICAL_VALUES_TABLE, SIGNIFICANCE_LEVELS } from './constants';

/**
 * Performs a lookup in a critical values table to determine the significance level
 * associated with a given chi-squared statistic and degrees of freedom.
 *
 * @param {number} chi2Statistic - The chi-squared statistic for which the significance level is to be determined.
 * @param {number} df - The degrees of freedom (an integer) for the chi-squared test.
 * @returns {number} The significance level corresponding to the chi-squared statistic and degrees of freedom.
 * @throws {Error} If df is less than 1 or not an integer.
 */
export const criticalTableLookup = (chi2Statistic: number, df: number) => {
  if (df < 1) return 1;
  if (!Number.isInteger(df)) throw Error('Degrees of freedom must be a valid integer');

  // Get the row index
  const rowIndex: number = df - 1;

  // Get the column index
  let minDiff: number = Math.abs(CRITICAL_VALUES_TABLE[rowIndex][0] - chi2Statistic);
  let columnIndex: number = 0;
  for (let j = 1; j < CRITICAL_VALUES_TABLE[rowIndex].length; j++) {
    const diff: number = Math.abs(CRITICAL_VALUES_TABLE[rowIndex][j] - chi2Statistic);
    if (diff < minDiff) {
      minDiff = diff;
      columnIndex = j;
    }
  }

  // Determine the significance level from the column index
  const significanceLevel: number = SIGNIFICANCE_LEVELS[columnIndex];
  return significanceLevel;
};
