/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildTimeRangeParams } from './build_time_range_params';

describe('buildTimeRangeParams', () => {
  it('returns undefined when no time range is provided', () => {
    expect(buildTimeRangeParams(undefined)).toBeUndefined();
  });

  it('resolves relative datemath expressions to ISO timestamps', () => {
    const result = buildTimeRangeParams({ from: 'now-24h', to: 'now' });
    expect(result).toHaveLength(2);
    expect(result![0]).toHaveProperty('_tstart');
    expect(result![1]).toHaveProperty('_tend');

    const tstart = result![0]._tstart as string;
    const tend = result![1]._tend as string;
    expect(new Date(tstart).toISOString()).toBe(tstart);
    expect(new Date(tend).toISOString()).toBe(tend);
    expect(new Date(tstart).getTime()).toBeLessThan(new Date(tend).getTime());
  });

  it('passes through absolute ISO timestamps unchanged', () => {
    const from = '2026-01-01T00:00:00.000Z';
    const to = '2026-01-31T23:59:59.000Z';
    const result = buildTimeRangeParams({ from, to });
    expect(result).toEqual([{ _tstart: from }, { _tend: to }]);
  });

  it('falls back to raw value if datemath is invalid', () => {
    const result = buildTimeRangeParams({ from: 'not-a-date', to: 'also-invalid' });
    expect(result).toEqual([{ _tstart: 'not-a-date' }, { _tend: 'also-invalid' }]);
  });

  it('rounds up the end time', () => {
    const result = buildTimeRangeParams({ from: 'now/d', to: 'now/d' });
    const tstart = new Date(result![0]._tstart as string).getTime();
    const tend = new Date(result![1]._tend as string).getTime();
    expect(tend).toBeGreaterThan(tstart);
  });
});
