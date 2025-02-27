/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * formatSignificanceLevel
 * @param significanceLevel
 */
export const formatSignificanceLevel = (significanceLevel: number | 'NaN') => {
  // NaN happens when the distributions are non overlapping. This means there is a drift, and the p-value would be astronomically small.
  if (significanceLevel === 'NaN') return '< 0.000001';
  if (typeof significanceLevel !== 'number' || isNaN(significanceLevel)) return '';

  if (significanceLevel < 1e-6) {
    return '< 0.000001';
  } else if (significanceLevel < 0.01) {
    return significanceLevel.toExponential(0);
  } else {
    return significanceLevel.toFixed(2);
  }
};
