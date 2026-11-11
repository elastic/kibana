/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createActionPolicy } from '../fixtures/test_utils';
import { PolicyCatalog } from './policy_catalog';

describe('PolicyCatalog', () => {
  const catalog = PolicyCatalog.of(
    new Map([
      ['p1', createActionPolicy({ id: 'p1', spaceId: 'space-a', apiKey: 'key-1' })],
      ['p2', createActionPolicy({ id: 'p2', spaceId: 'space-b', grouping: { mode: 'all' } })],
    ])
  );

  it('resolves policies by id', () => {
    expect(catalog.get('p1')?.id).toBe('p1');
    expect(catalog.get('missing')).toBeUndefined();
  });

  it('groups policies by space', () => {
    expect(catalog.inSpace('space-a').map((p) => p.id)).toEqual(['p1']);
    expect(catalog.inSpace('space-b').map((p) => p.id)).toEqual(['p2']);
    expect(catalog.inSpace('unknown')).toEqual([]);
  });

  it('falls back to per_alert grouping for absent policies or modes', () => {
    expect(catalog.groupingModeOf('p1')).toBe('per_alert');
    expect(catalog.groupingModeOf('p2')).toBe('all');
    expect(catalog.groupingModeOf('missing')).toBe('per_alert');
  });

  it('resolves the dispatch api key', () => {
    expect(catalog.apiKeyOf('p1')).toBe('key-1');
    expect(catalog.apiKeyOf('p2')).toBeUndefined();
  });

  it('resolves the effective throttle strategy, defaulting by grouping mode', () => {
    // No throttle configured: per_alert notifies on status change, other modes once per interval.
    expect(catalog.throttleStrategyOf('p1')).toBe('on_status_change');
    expect(catalog.throttleStrategyOf('p2')).toBe('time_interval');
    expect(catalog.throttleStrategyOf('missing')).toBeUndefined();
  });

  it('returns the configured throttle strategy when the policy has one', () => {
    const withThrottle = PolicyCatalog.of(
      new Map([
        [
          'p3',
          createActionPolicy({
            id: 'p3',
            throttle: { strategy: 'every_time' },
          }),
        ],
      ])
    );

    expect(withThrottle.throttleStrategyOf('p3')).toBe('every_time');
  });
});
