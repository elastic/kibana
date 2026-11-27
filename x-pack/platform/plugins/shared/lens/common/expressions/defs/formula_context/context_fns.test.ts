/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { Adapters } from '@kbn/inspector-plugin/common';
import { formulaIntervalFn, formulaNowFn, formulaTimeRangeFn } from './context_fns';

describe('interval', () => {
  it('should return 0 if no time range available', () => {
    // (not sure if this case is actually possible)
    const result = formulaIntervalFn.fn(undefined, { targetBars: 100 }, {
      getSearchContext: () => ({
        /* no time range */
      }),
    } as ExecutionContext<Adapters>);
    expect(result).toEqual(0);
  });

  it('should return 0 if no targetBars is passed', () => {
    const result = formulaIntervalFn.fn(
      undefined,
      {
        /* no targetBars */
      },
      {
        getSearchContext: () => ({
          timeRange: {
            from: 'now-15m',
            to: 'now',
          },
        }),
      } as ExecutionContext<Adapters>
    );
    expect(result).toEqual(0);
  });

  it('should not throw for a decimal targetBars', () => {
    const context = {
      getSearchContext: () => ({ timeRange: { from: 'now-15m', to: 'now' } }),
    } as ExecutionContext<Adapters>;

    expect(formulaIntervalFn.fn(undefined, { targetBars: 50.5 }, context)).toBeGreaterThan(0);
    expect(formulaIntervalFn.fn(undefined, { targetBars: -3 }, context)).toBeGreaterThan(0);
  });

  it('should pick the interval in the given time zone', () => {
    // 100 hours. In UTC that is exactly 100 hourly buckets. In Asia/Kolkata (+05:30) the range starts
    // at 05:30 local, so it touches 101 local hours, and 1h no longer fits.
    const context = {
      getSearchContext: () => ({
        timeRange: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-05T04:00:00.000Z' },
      }),
    } as ExecutionContext<Adapters>;
    const hour = 36e5;

    expect(formulaIntervalFn.fn(undefined, { targetBars: 100, timeZone: 'UTC' }, context)).toBe(
      hour
    );
    expect(formulaIntervalFn.fn(undefined, { targetBars: 100 }, context)).toBe(hour);
    expect(
      formulaIntervalFn.fn(undefined, { targetBars: 100, timeZone: 'Asia/Kolkata' }, context)
    ).toBe(3 * hour);
  });

  it('should return a valid value > 0 if both timeRange and targetBars is passed', () => {
    const result = formulaIntervalFn.fn(undefined, { targetBars: 100 }, {
      getSearchContext: () => ({
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
      }),
    } as ExecutionContext<Adapters>);
    expect(result).toEqual(10000);
  });
});

describe('time range', () => {
  it('should return 0 if no time range is available', () => {
    // (not sure if this case is actually possible)
    const result = formulaTimeRangeFn.fn(undefined, {}, {
      getSearchContext: () => ({
        /* no time range */
      }),
    } as ExecutionContext<Adapters>);
    expect(result).toEqual(0);
  });

  it('should return a valid value > 0 if time range is available', () => {
    const result = formulaTimeRangeFn.fn(undefined, {}, {
      getSearchContext: () => ({
        timeRange: {
          from: 'now-15m',
          to: 'now',
        },
        now: 1000000, // important to provide this to make the result consistent
      }),
    } as ExecutionContext<Adapters>);

    expect(result).toBe(900000);
  });
});

describe('now', () => {
  it('should return the now value when passed', () => {
    const now = 123456789;
    expect(
      formulaNowFn.fn(undefined, {}, {
        getSearchContext: () => ({
          now,
        }),
      } as ExecutionContext<Adapters>)
    ).toEqual(now);
  });
});
