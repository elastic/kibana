/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet, SignificantItem } from '@kbn/ml-agg-utils';

import { buildSimpleHierarchicalTreeIndexes } from './build_simple_hierarchical_tree_indexes';
import { getFieldValuePairKey } from './get_field_value_pair_key';

describe('buildSimpleHierarchicalTreeIndexes', () => {
  it('builds pair indexes and initializes caches', () => {
    const itemSets: ItemSet[] = [
      {
        set: [
          { fieldName: 'status', fieldValue: 500 },
          { fieldName: 'url', fieldValue: 'home.php' },
          // duplicate pair in same itemset should not duplicate index in postings
          { fieldName: 'url', fieldValue: 'home.php' },
        ],
        size: 3,
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
        maxPValue: 0.2,
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
      {
        key: 'url:home.php',
        type: 'keyword',
        fieldName: 'url',
        fieldValue: 'home.php',
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

    expect(indexes.significantItemByPairKey.get(getFieldValuePairKey('status', 500))).toEqual(
      significantItems[0]
    );
    expect(indexes.itemSetIndexesByPairKey.get(getFieldValuePairKey('status', 500))).toEqual([
      0, 1,
    ]);
    expect(indexes.itemSetIndexesByPairKey.get(getFieldValuePairKey('url', 'home.php'))).toEqual([
      0,
    ]);
    expect(indexes.itemSetIndexesByPairKey.get(getFieldValuePairKey('url', 'login.php'))).toEqual([
      1,
    ]);
    expect(indexes.valueCountsByFieldAndSubsetKey.size).toBe(0);
  });
});
