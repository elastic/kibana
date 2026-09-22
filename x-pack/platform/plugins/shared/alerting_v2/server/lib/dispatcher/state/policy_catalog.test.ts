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
      ['p2', createActionPolicy({ id: 'p2', spaceId: 'space-b', groupingMode: 'all' })],
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

  it('falls back to per_episode grouping for absent policies or modes', () => {
    expect(catalog.groupingModeOf('p1')).toBe('per_episode');
    expect(catalog.groupingModeOf('p2')).toBe('all');
    expect(catalog.groupingModeOf('missing')).toBe('per_episode');
  });

  it('resolves the dispatch api key', () => {
    expect(catalog.apiKeyOf('p1')).toBe('key-1');
    expect(catalog.apiKeyOf('p2')).toBeUndefined();
  });
});
