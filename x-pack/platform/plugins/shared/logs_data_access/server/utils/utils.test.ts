/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getLogRatePerMinute, getLogErrorRate } from '.';

describe('getLogRatePerMinute', () => {
  it('should log rate per minute for one minute period', () => {
    expect(getLogRatePerMinute({ logCount: 60, timeFrom: 0, timeTo: 60000 })).toBe(60);
  });

  it('should log rate per minute for five minutes period', () => {
    expect(getLogRatePerMinute({ logCount: 60, timeFrom: 0, timeTo: 300000 })).toBe(12);
  });

  it('should handle zero log count', () => {
    expect(getLogRatePerMinute({ logCount: 0, timeFrom: 0, timeTo: 60000 })).toBe(0);
  });
});

describe('getLogErrorRate', () => {
  it('should return the correct log error rate', () => {
    expect(getLogErrorRate({ logCount: 100, logErrorCount: 10 })).toBe(0.1);
  });

  it('should handle zero error count', () => {
    expect(getLogErrorRate({ logCount: 100, logErrorCount: 0 })).toBe(0);
  });

  it('should handle no error count provided', () => {
    expect(getLogErrorRate({ logCount: 100 })).toBe(0);
  });

  it('should handle error count exceeding log count', () => {
    expect(getLogErrorRate({ logCount: 100, logErrorCount: 150 })).toBe(1.5);
  });
});
