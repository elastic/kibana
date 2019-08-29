/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAnalysisType, isOutlierAnalysis } from './analytics';

describe('Data Frame Analytics: Analytics utils', () => {
  test('getAnalysisType()', () => {
    const outlierAnalysis = { outlier_detection: {} };
    expect(getAnalysisType(outlierAnalysis)).toBe('outlier_detection');

    const regressionAnalysis = { regression: {} };
    expect(getAnalysisType(regressionAnalysis)).toBe('regression');

    const unknownAnalysis = { outlier_detection: {}, regression: {} };
    expect(getAnalysisType(unknownAnalysis)).toBe('unknown');
  });

  test('isOutlierAnalysis()', () => {
    const outlierAnalysis = { outlier_detection: {} };
    expect(isOutlierAnalysis(outlierAnalysis)).toBe(true);

    const regressionAnalysis = { regression: {} };
    expect(isOutlierAnalysis(regressionAnalysis)).toBe(false);

    const unknownAnalysis = { outlier_detection: {}, regression: {} };
    expect(isOutlierAnalysis(unknownAnalysis)).toBe(false);
  });
});
