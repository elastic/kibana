/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantItemGroups } from '@kbn/aiops-test-utils/farequote/significant_item_groups';
import { fields } from '@kbn/aiops-test-utils/artificial_logs/fields';
import { filteredFrequentItemSets } from '@kbn/aiops-test-utils/artificial_logs/filtered_frequent_item_sets';
import { significantTerms } from '@kbn/aiops-test-utils/artificial_logs/significant_terms';

import { getFieldValuePairCounts } from './get_field_value_pair_counts';
import { getMarkedDuplicates } from './get_marked_duplicates';
import { getSimpleHierarchicalTree } from './get_simple_hierarchical_tree';
import { getSimpleHierarchicalTreeLeaves } from './get_simple_hierarchical_tree_leaves';

describe('markDuplicates', () => {
  it('marks duplicates based on significant items groups for farequote', () => {
    const fieldValuePairCounts = getFieldValuePairCounts(significantItemGroups);
    const markedDuplicates = getMarkedDuplicates(significantItemGroups, fieldValuePairCounts);

    expect(markedDuplicates).toEqual([
      {
        id: 'group-1',
        group: [
          {
            key: 'custom_field.keyword:deviation',
            type: 'keyword',
            fieldName: 'custom_field.keyword',
            fieldValue: 'deviation',
            docCount: 101,
            duplicate: 2,
            pValue: 0.01,
          },
          {
            key: 'airline:UAL',
            type: 'keyword',
            fieldName: 'airline',
            fieldValue: 'UAL',
            docCount: 101,
            duplicate: 1,
            pValue: 0.01,
          },
        ],
        docCount: 101,
        pValue: 0.01,
      },
      {
        id: 'group-2',
        group: [
          {
            key: 'custom_field.keyword:deviation',
            type: 'keyword',
            fieldName: 'custom_field.keyword',
            fieldValue: 'deviation',
            docCount: 49,
            duplicate: 2,
            pValue: 0.001,
          },
          {
            key: 'airline:AAL',
            type: 'keyword',
            fieldName: 'airline',
            fieldValue: 'AAL',
            docCount: 49,
            duplicate: 1,
            pValue: 0.001,
          },
        ],
        docCount: 49,
        pValue: 0.001,
      },
    ]);
  });

  it('marks duplicates based on significant items groups for artificial logs', () => {
    const simpleHierarchicalTree = getSimpleHierarchicalTree(
      filteredFrequentItemSets,
      true,
      false,
      significantTerms,
      fields
    );
    const leaves = getSimpleHierarchicalTreeLeaves(simpleHierarchicalTree.root, []);
    const fieldValuePairCounts = getFieldValuePairCounts(leaves);
    const markedDuplicates = getMarkedDuplicates(leaves, fieldValuePairCounts);

    expect(markedDuplicates).toEqual([
      {
        id: '3189595908',
        group: [
          {
            key: 'response_code:500',
            type: 'keyword',
            fieldName: 'response_code',
            fieldValue: '500',
            docCount: 792,
            duplicate: 1,
            pValue: 0.010770456205312423,
          },
          {
            key: 'url:home.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'home.php',
            docCount: 792,
            duplicate: 2,
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
            duplicate: 2,
            pValue: 0.010770456205312423,
          },
          {
            key: 'user:Peter',
            type: 'keyword',
            fieldName: 'user',
            fieldValue: 'Peter',
            docCount: 634,
            duplicate: 1,
            pValue: 0.010770456205312423,
          },
        ],
        docCount: 634,
        pValue: 0.010770456205312423,
      },
    ]);
  });
});
