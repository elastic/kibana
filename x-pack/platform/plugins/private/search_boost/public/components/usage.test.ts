/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUsage } from './usage';

describe('getUsage', () => {
  it('counts the matches no higher-ranked rule outranks, with their storage size', () => {
    expect(
      getUsage([
        { name: 'catalog-products', storageSizeInBytes: 100 },
        { name: '.internal-alerts', storageSizeInBytes: 20 },
        { name: 'orders', storageSizeInBytes: 5, outrankedByRuleName: 'other' },
      ])
    ).toEqual({ appliesTo: 2, storageSizeInBytes: 120 });
  });

  it('is empty without matches', () => {
    expect(getUsage([])).toEqual({ appliesTo: 0, storageSizeInBytes: 0 });
  });

  it('leaves the storage size out when any size could not be loaded', () => {
    expect(
      getUsage([{ name: 'catalog-products', storageSizeInBytes: 100 }, { name: 'customers' }])
    ).toEqual({ appliesTo: 2, storageSizeInBytes: undefined });
  });

  it('ignores the sizes of outranked matches', () => {
    expect(
      getUsage([
        { name: 'catalog-products', storageSizeInBytes: 100 },
        { name: 'orders', outrankedByRuleName: 'other' },
      ])
    ).toEqual({ appliesTo: 1, storageSizeInBytes: 100 });
  });
});
