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
        { name: 'catalog-products', isHidden: false, storageSizeInBytes: 100 },
        { name: '.internal-alerts', isHidden: true, storageSizeInBytes: 20 },
        { name: 'orders', isHidden: false, storageSizeInBytes: 5, outrankedByRuleName: 'other' },
        { name: 'customers', isHidden: false },
      ])
    ).toEqual({ appliesTo: 3, storageSizeInBytes: 120 });
  });

  it('is empty without matches', () => {
    expect(getUsage([])).toEqual({ appliesTo: 0, storageSizeInBytes: 0 });
  });
});
