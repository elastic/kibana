/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBaselineAndDeviationRates } from './get_baseline_and_deviation_rates';
import { LOG_RATE_ANALYSIS_TYPE } from './log_rate_analysis_type';

describe('getBaselineAndDeviationRates', () => {
  it('calculates rates for SPIKE analysis', () => {
    const analysisType = LOG_RATE_ANALYSIS_TYPE.SPIKE;
    const baselineBuckets = 10;
    const deviationBuckets = 5;
    const docCount = 100;
    const bgCount = 50;
    const expected = {
      baselineBucketRate: 5, // 50 / 10
      deviationBucketRate: 20, // 100 / 5
    };

    const result = getBaselineAndDeviationRates(
      analysisType,
      baselineBuckets,
      deviationBuckets,
      docCount,
      bgCount
    );

    expect(result).toEqual(expected);
  });

  it('calculates rates for DIP analysis', () => {
    const analysisType = LOG_RATE_ANALYSIS_TYPE.DIP;
    const baselineBuckets = 8;
    const deviationBuckets = 4;
    const docCount = 80; // Now represents baseline period in DIP
    const bgCount = 40; // Now represents deviation period in DIP
    const expected = {
      baselineBucketRate: 10, // 80 / 8
      deviationBucketRate: 10, // 40 / 4
    };

    const result = getBaselineAndDeviationRates(
      analysisType,
      baselineBuckets,
      deviationBuckets,
      docCount,
      bgCount
    );

    expect(result).toEqual(expected);
  });

  it('handles zero buckets without throwing error', () => {
    const analysisType = LOG_RATE_ANALYSIS_TYPE.SPIKE;
    const baselineBuckets = 0;
    const deviationBuckets = 0;
    const docCount = 100;
    const bgCount = 50;
    const expected = {
      baselineBucketRate: 0,
      deviationBucketRate: 0,
    };

    const result = getBaselineAndDeviationRates(
      analysisType,
      baselineBuckets,
      deviationBuckets,
      docCount,
      bgCount
    );

    expect(result).toEqual(expected);
  });
});
