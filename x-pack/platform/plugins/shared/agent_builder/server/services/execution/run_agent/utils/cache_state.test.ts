/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeCacheState, parseCacheControlTtl } from './cache_state';

describe('parseCacheControlTtl', () => {
  it('parses minutes and hours', () => {
    expect(parseCacheControlTtl({ type: 'ephemeral', ttl: '5m' })).toBe(300);
    expect(parseCacheControlTtl({ type: 'ephemeral', ttl: '1h' })).toBe(3600);
    expect(parseCacheControlTtl(undefined)).toBeUndefined();
  });
});

describe('computeCacheState', () => {
  const now = Date.parse('2026-01-01T00:10:00.000Z');

  it('is cold without a previous round or on connector change', () => {
    expect(computeCacheState({ connectorId: 'c', now })).toBe('cold');
    expect(
      computeCacheState({
        lastTerminatedAt: '2026-01-01T00:09:00.000Z',
        lastConnectorId: 'other',
        connectorId: 'c',
        now,
      })
    ).toBe('cold');
  });

  it('is hot within the ttl and cold after it', () => {
    const base = {
      lastConnectorId: 'c',
      connectorId: 'c',
      cacheControl: { type: 'ephemeral' as const, ttl: '5m' as const },
      now,
    };
    expect(computeCacheState({ ...base, lastTerminatedAt: '2026-01-01T00:07:00.000Z' })).toBe(
      'hot'
    );
    expect(computeCacheState({ ...base, lastTerminatedAt: '2026-01-01T00:04:00.000Z' })).toBe(
      'cold'
    );
  });

  it('falls back to 300s without cacheControl', () => {
    expect(
      computeCacheState({
        lastTerminatedAt: '2026-01-01T00:06:00.000Z',
        lastConnectorId: 'c',
        connectorId: 'c',
        now,
      })
    ).toBe('hot');
    expect(
      computeCacheState({
        lastTerminatedAt: '2026-01-01T00:04:00.000Z',
        lastConnectorId: 'c',
        connectorId: 'c',
        now,
      })
    ).toBe('cold');
  });
});
