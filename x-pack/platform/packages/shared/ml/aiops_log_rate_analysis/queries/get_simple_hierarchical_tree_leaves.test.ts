/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fields } from '@kbn/aiops-test-utils/artificial_logs/fields';
import { filteredFrequentItemSets } from '@kbn/aiops-test-utils/artificial_logs/filtered_frequent_item_sets';
import { significantTerms } from '@kbn/aiops-test-utils/artificial_logs/significant_terms';

import { getSimpleHierarchicalTree } from './get_simple_hierarchical_tree';
import { getSimpleHierarchicalTreeLeaves } from './get_simple_hierarchical_tree_leaves';

describe('getSimpleHierarchicalTreeLeaves', () => {
  it('returns the hierarchical tree leaves', () => {
    const simpleHierarchicalTree = getSimpleHierarchicalTree(
      filteredFrequentItemSets,
      true,
      false,
      significantTerms,
      fields
    );
    const leaves = getSimpleHierarchicalTreeLeaves(simpleHierarchicalTree.root, []);
    expect(leaves).toEqual([
      {
        id: '3189595908',
        group: [
          {
            key: 'response_code:500',
            type: 'keyword',
            fieldName: 'response_code',
            fieldValue: '500',
            docCount: 792,
            pValue: 0.010770456205312423,
          },
          {
            key: 'url:home.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'home.php',
            docCount: 792,
            pValue: 0.010770456205312423,
          },
        ],
        docCount: 792,
        pValue: 0.010770456205312423,
      },
      {
        id: '715957062',
        group: [
          {
            key: 'url:home.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'home.php',
            docCount: 792,
            pValue: 0.010770456205312423,
          },
          {
            key: 'user:Peter',
            type: 'keyword',
            fieldName: 'user',
            fieldValue: 'Peter',
            docCount: 634,
            pValue: 0.010770456205312423,
          },
        ],
        docCount: 634,
        pValue: 0.010770456205312423,
      },
    ]);
  });
});
