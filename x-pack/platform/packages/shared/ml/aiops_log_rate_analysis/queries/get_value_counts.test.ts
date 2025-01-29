/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frequentItemSets } from '@kbn/aiops-test-utils/artificial_logs/frequent_item_sets';

import { getValueCounts } from './get_value_counts';

describe('getValueCounts', () => {
  it('get value counts for field response_code', () => {
    expect(getValueCounts(frequentItemSets, 'response_code')).toEqual({
      '500': 3,
    });
  });

  it('get value counts for field url', () => {
    expect(getValueCounts(frequentItemSets, 'url')).toEqual({ 'home.php': 2, 'login.php': 2 });
  });

  it('get value counts for field user', () => {
    expect(getValueCounts(frequentItemSets, 'user')).toEqual({
      Peter: 3,
    });
  });
});
