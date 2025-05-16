/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogRateHistogramItem } from './log_rate_histogram_item';
import { getLogRateAnalysisTypeForHistogram } from './get_log_rate_analysis_type_for_histogram';

describe('getLogRateAnalysisTypeForHistogram', () => {
  const LogRateHistogramMock: LogRateHistogramItem[] = [
    { time: 0, value: 10 },
    { time: 1, value: 10 },
    { time: 2, value: 10 },
    { time: 3, value: 5 },
    { time: 4, value: 10 },
    { time: 5, value: 10 },
    { time: 6, value: 10 },
    { time: 7, value: 20 },
    { time: 8, value: 10 },
    { time: 9, value: 10 },
  ];

  test('returns "spike" for the given parameters', () => {
    expect(
      getLogRateAnalysisTypeForHistogram(LogRateHistogramMock, {
        baselineMin: 4,
        baselineMax: 6,
        deviationMin: 7,
        deviationMax: 8,
      })
    ).toBe('spike');
  });

  test('returns "dip" for the given parameters', () => {
    expect(
      getLogRateAnalysisTypeForHistogram(LogRateHistogramMock, {
        baselineMin: 0,
        baselineMax: 2,
        deviationMin: 3,
        deviationMax: 4,
      })
    ).toBe('dip');
  });

  test('falls back to "spike" if both time range have the same median', () => {
    expect(
      getLogRateAnalysisTypeForHistogram(LogRateHistogramMock, {
        baselineMin: 0,
        baselineMax: 2,
        deviationMin: 4,
        deviationMax: 6,
      })
    ).toBe('spike');
  });
});
