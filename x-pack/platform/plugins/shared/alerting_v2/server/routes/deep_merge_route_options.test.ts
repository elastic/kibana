/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepMergeRouteOptions } from './deep_merge_route_options';

describe('deepMergeRouteOptions', () => {
  it('returns base when overrides is empty', () => {
    const base = { access: 'public' as const, tags: ['a'] };
    expect(deepMergeRouteOptions(base, {})).toEqual({ access: 'public', tags: ['a'] });
  });

  it('overrides scalar values', () => {
    const base = { access: 'public' as const };
    const overrides = { access: 'internal' as const };
    expect(deepMergeRouteOptions(base, overrides)).toEqual({ access: 'internal' });
  });

  it('adds new keys from overrides', () => {
    const base = { tags: ['a'] };
    const overrides = { summary: 'A summary' };
    expect(deepMergeRouteOptions(base, overrides)).toEqual({ tags: ['a'], summary: 'A summary' });
  });

  it('concatenates arrays instead of replacing', () => {
    const base = { tags: ['parent-tag'] };
    const overrides = { tags: ['child-tag'] };
    expect(deepMergeRouteOptions(base, overrides)).toEqual({ tags: ['parent-tag', 'child-tag'] });
  });

  it('deep merges nested objects', () => {
    const base = { availability: { stability: 'experimental' as const } };
    const overrides = { availability: { since: '1.0' } };
    expect(deepMergeRouteOptions(base, overrides)).toEqual({
      availability: { stability: 'experimental', since: '1.0' },
    });
  });
});
