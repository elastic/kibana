/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet, SignificantItem } from '@kbn/ml-agg-utils';

import { buildSimpleHierarchicalTreeIndexes } from './build_simple_hierarchical_tree_indexes';
import { getValueCountsForField } from './get_value_counts_for_field';

describe('getValueCountsForField', () => {
  it('computes and caches value counts by subset and field', () => {
    const itemSets: ItemSet[] = [
      {
        set: [
          { fieldName: 'status', fieldValue: 500 },
          { fieldName: 'url', fieldValue: 'home.php' },
        ],
        size: 2,
        maxPValue: 0.1,
        doc_count: 10,
        support: 0.1,
        total_doc_count: 100,
      },
      {
        set: [
          { fieldName: 'status', fieldValue: 500 },
          { fieldName: 'url', fieldValue: 'login.php' },
        ],
        size: 2,
        maxPValue: 0.1,
        doc_count: 9,
        support: 0.09,
        total_doc_count: 100,
      },
      {
        set: [
          { fieldName: 'status', fieldValue: 404 },
          { fieldName: 'url', fieldValue: 'home.php' },
        ],
        size: 2,
        maxPValue: 0.1,
        doc_count: 8,
        support: 0.08,
        total_doc_count: 100,
      },
    ];

    const significantItems: SignificantItem[] = [
      {
        key: 'status:500',
        type: 'keyword',
        fieldName: 'status',
        fieldValue: 500,
        doc_count: 10,
        bg_count: 5,
        total_doc_count: 100,
        total_bg_count: 80,
        score: 1,
        pValue: 0.1,
        normalizedScore: 0.2,
      },
    ];

    const indexes = buildSimpleHierarchicalTreeIndexes(itemSets, significantItems);
    const subset = [0, 1];

    const firstCounts = getValueCountsForField(itemSets, subset, 'url', indexes);
    const secondCounts = getValueCountsForField(itemSets, subset, 'url', indexes);

    expect(firstCounts).toEqual({
      'home.php': 1,
      'login.php': 1,
    });
    expect(secondCounts).toBe(firstCounts);
    expect(indexes.valueCountsByFieldAndSubsetKey.size).toBe(1);
  });
});
