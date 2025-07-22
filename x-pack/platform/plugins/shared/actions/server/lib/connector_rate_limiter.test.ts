/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorRateLimiter } from './connector_rate_limiter';

describe('ConnectorRateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-24T15:30:00.000Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  it('should log connector usage when the connector type is defined in rateLimiter config', () => {
    const config = {
      email: {
        limit: 5,
        lookbackWindow: '1m',
      },
    };
    const connectorRateLimiter = new ConnectorRateLimiter({ config });

    let i = 0;
    while (i < 3) {
      i = i + 1;
      connectorRateLimiter.log('.email');
      jest.advanceTimersByTime(1000);
    }

    expect(connectorRateLimiter.getLogs('.email')).toEqual([
      1750779000000, 1750779001000, 1750779002000,
    ]);
    jest.useRealTimers();
  });

  it('should clear the logs older than the start of lookbackWindow', () => {
    const config = {
      email: {
        limit: 100,
        lookbackWindow: '10s',
      },
    };
    const connectorRateLimiter = new ConnectorRateLimiter({ config });

    let i = 0;
    while (i <= 15) {
      i = i + 1;
      connectorRateLimiter.log('.email');
      jest.advanceTimersByTime(1000);
    }

    expect(connectorRateLimiter.getLogs('.email')).toEqual([
      1750779000000, 1750779001000, 1750779002000, 1750779003000, 1750779004000, 1750779005000,
      1750779006000, 1750779007000, 1750779008000, 1750779009000, 1750779010000, 1750779011000,
      1750779012000, 1750779013000, 1750779014000, 1750779015000,
    ]);

    expect(connectorRateLimiter.isRateLimited('.email')).toBe(false);

    expect(connectorRateLimiter.getLogs('.email')).toEqual([
      1750779006000, 1750779007000, 1750779008000, 1750779009000, 1750779010000, 1750779011000,
      1750779012000, 1750779013000, 1750779014000, 1750779015000,
    ]);
  });

  it("isRateLimited returns false when the number of logs doesn't exceed the limit in the given lookbackWindow", () => {
    const config = {
      email: {
        limit: 5,
        lookbackWindow: '10s',
      },
    };
    const connectorRateLimiter = new ConnectorRateLimiter({ config });

    let i = 0;
    while (i < 5) {
      i = i + 1;
      connectorRateLimiter.log('.email');
      jest.advanceTimersByTime(1000);
    }

    expect(connectorRateLimiter.isRateLimited('.email')).toBe(false);
  });

  it('isRateLimited returns true when the number of logs exceeds the limit in the given lookbackWindow', () => {
    const config = {
      email: {
        limit: 5,
        lookbackWindow: '10s',
      },
    };
    const connectorRateLimiter = new ConnectorRateLimiter({ config });

    let i = 0;
    while (i < 10) {
      i = i + 1;
      connectorRateLimiter.log('.email');
      jest.advanceTimersByTime(1000);
    }

    expect(connectorRateLimiter.isRateLimited('.email')).toBe(true);
  });
});
