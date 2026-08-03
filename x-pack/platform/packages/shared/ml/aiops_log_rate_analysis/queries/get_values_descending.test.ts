/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValuesDescendingFromValueCounts } from './get_values_descending';

describe('getValuesDescendingFromValueCounts', () => {
  it('gets descending values from precomputed value counts', () => {
    expect(
      getValuesDescendingFromValueCounts({
        low: 1,
        high: 3,
        medium: 2,
      })
    ).toEqual(['high', 'medium', 'low']);
  });
});
