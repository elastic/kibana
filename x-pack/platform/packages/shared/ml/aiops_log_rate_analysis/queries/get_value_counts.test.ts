/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { frequentItemSets } from '@kbn/aiops-test-utils/artificial_logs/frequent_item_sets';

import { getValueCountsForItemSetIndexes } from './get_value_counts';

describe('getValueCountsForItemSetIndexes', () => {
  it('get value counts for field response_code', () => {
    expect(
      getValueCountsForItemSetIndexes(
        frequentItemSets,
        frequentItemSets.map((_, index) => index),
        'response_code'
      )
    ).toEqual({
      '500': 3,
    });
  });

  it('get value counts for field url', () => {
    expect(
      getValueCountsForItemSetIndexes(
        frequentItemSets,
        frequentItemSets.map((_, index) => index),
        'url'
      )
    ).toEqual({ 'home.php': 2, 'login.php': 2 });
  });

  it('get value counts for field user', () => {
    expect(
      getValueCountsForItemSetIndexes(
        frequentItemSets,
        frequentItemSets.map((_, index) => index),
        'user'
      )
    ).toEqual({
      Peter: 3,
    });
  });

  it('gets value counts for field from selected itemset indexes', () => {
    expect(getValueCountsForItemSetIndexes(frequentItemSets, [0, 1], 'url')).toEqual({
      'home.php': 1,
      'login.php': 1,
    });
  });
});
