/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE } from './log_rate_analysis_type';
import { getLogRateChange } from './get_log_rate_change';

describe('getLogRateChange', () => {
  it('calculates the factor and message for a SPIKE analysis with factor < 10', () => {
    const analysisType = LOG_RATE_ANALYSIS_TYPE.SPIKE;
    const baselineBucketRate = 5;
    const deviationBucketRate = 44;
    const expectedFactor = 8.8;
    const expectedMessage = '8.8x higher';

    const { message, factor } = getLogRateChange(
      analysisType,
      baselineBucketRate,
      deviationBucketRate
    );

    expect(factor).toBe(expectedFactor);
    expect(message).toBe(expectedMessage);
  });

  it('calculates the factor and message for a SPIKE analysis with factor >= 10', () => {
    const analysisType = LOG_RATE_ANALYSIS_TYPE.SPIKE;
    const baselineBucketRate = 5;
    const deviationBucketRate = 51;
    const expectedFactor = 10;
    const expectedMessage = '10x higher';

    const { message, factor } = getLogRateChange(
      analysisType,
      baselineBucketRate,
      deviationBucketRate
    );

    expect(factor).toEqual(expectedFactor);
    expect(message).toContain(expectedMessage);
  });

  it('calculates the factor and message for a DIP analysis with factor < 10', () => {
    const analysisType = LOG_RATE_ANALYSIS_TYPE.DIP;
    const baselineBucketRate = 256;
    const deviationBucketRate = 44;
    const expectedFactor = 5.8;
    const expectedMessage = '5.8x lower';

    const { message, factor } = getLogRateChange(
      analysisType,
      baselineBucketRate,
      deviationBucketRate
    );

    expect(factor).toBe(expectedFactor);
    expect(message).toBe(expectedMessage);
  });

  it('calculates the factor and message for a DIP analysis with factor >= 10', () => {
    const analysisType = LOG_RATE_ANALYSIS_TYPE.DIP;
    const baselineBucketRate = 1024;
    const deviationBucketRate = 51;
    const expectedFactor = 20;
    const expectedMessage = '20x lower';

    const { message, factor } = getLogRateChange(
      analysisType,
      baselineBucketRate,
      deviationBucketRate
    );

    expect(factor).toEqual(expectedFactor);
    expect(message).toContain(expectedMessage);
  });

  it('handles a baseline rate of 0 without throwing an error', () => {
    const analysisType = LOG_RATE_ANALYSIS_TYPE.SPIKE;
    const baselineBucketRate = 0;
    const deviationBucketRate = 10;
    const expectedMessage = 'up to 10 from 0 in baseline';
    const { message, factor } = getLogRateChange(
      analysisType,
      baselineBucketRate,
      deviationBucketRate
    );

    // Factor is undefined if baseline rate is 0
    expect(factor).toBe(undefined);
    expect(message).toContain(expectedMessage);
  });

  it('handles a deviation rate of 0 without throwing an error', () => {
    const analysisType = LOG_RATE_ANALYSIS_TYPE.DIP;
    const baselineBucketRate = 500;
    const deviationBucketRate = 0;
    const expectedMessage = 'down to 0 from 500 in baseline';

    const { message, factor } = getLogRateChange(
      analysisType,
      baselineBucketRate,
      deviationBucketRate
    );

    // Factor is undefined if deviation rate is 0
    expect(factor).toBe(undefined);
    expect(message).toContain(expectedMessage);
  });
});
