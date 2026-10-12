/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyFrozenTierExclusion, excludeFrozenTierQuery } from './data_tiers';

describe('excludeFrozenTierQuery', () => {
  it('builds a must_not term clause on _tier', () => {
    expect(excludeFrozenTierQuery()).toEqual({
      bool: {
        must_not: [{ term: { _tier: 'data_frozen' } }],
      },
    });
  });
});

describe('applyFrozenTierExclusion', () => {
  it('returns the exclusion when no filter is provided', () => {
    expect(applyFrozenTierExclusion(undefined)).toEqual({
      bool: {
        must_not: [{ term: { _tier: 'data_frozen' } }],
      },
    });
  });

  it('combines a caller filter with the exclusion', () => {
    expect(applyFrozenTierExclusion({ term: { status: 'open' } })).toEqual({
      bool: {
        filter: [{ term: { status: 'open' } }],
        must_not: [{ term: { _tier: 'data_frozen' } }],
      },
    });
  });

  it('returns undefined when frozen tier is included and no filter is provided', () => {
    expect(applyFrozenTierExclusion(undefined, true)).toBeUndefined();
  });

  it('returns the caller filter untouched when frozen tier is included', () => {
    const filter = { term: { status: 'open' } };
    expect(applyFrozenTierExclusion(filter, true)).toBe(filter);
  });
});
