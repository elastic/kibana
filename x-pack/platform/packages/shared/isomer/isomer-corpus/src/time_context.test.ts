/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveTimeRange, toGlobalStateQuery } from './time_context';

describe('resolveTimeRange', () => {
  const now = new Date('2025-01-15T12:34:56.789Z');

  it('resolves relative expressions against the given now', () => {
    expect(resolveTimeRange({ from: 'now-7d', to: 'now' }, now, 'UTC')).toEqual({
      from: '2025-01-08T12:34:56.789Z',
      to: '2025-01-15T12:34:56.789Z',
    });
  });

  it('rounds `to` up and `from` down, as the time picker does', () => {
    expect(resolveTimeRange({ from: 'now/d', to: 'now/d' }, now, 'UTC')).toEqual({
      from: '2025-01-15T00:00:00.000Z',
      to: '2025-01-15T23:59:59.999Z',
    });
  });

  it('rounds in the given time zone', () => {
    expect(resolveTimeRange({ from: 'now/d', to: 'now/d' }, now, 'America/New_York')).toEqual({
      from: '2025-01-15T05:00:00.000Z',
      to: '2025-01-16T04:59:59.999Z',
    });
  });

  it('keeps absolute ranges', () => {
    const range = { from: '2024-01-01T00:00:00.000Z', to: '2024-01-08T00:00:00.000Z' };
    expect(resolveTimeRange(range, now, 'UTC')).toEqual(range);
  });

  it('throws on an expression it cannot parse', () => {
    expect(() => resolveTimeRange({ from: 'now-7x', to: 'now' }, now, 'UTC')).toThrow(
      'Unable to resolve time range'
    );
  });
});

describe('toGlobalStateQuery', () => {
  it('builds rison global state with the time range', () => {
    expect(
      toGlobalStateQuery({ from: '2024-01-01T00:00:00.000Z', to: '2024-01-08T00:00:00.000Z' })
    ).toBe("_g=(time:(from:'2024-01-01T00:00:00.000Z',to:'2024-01-08T00:00:00.000Z'))");
  });
});
