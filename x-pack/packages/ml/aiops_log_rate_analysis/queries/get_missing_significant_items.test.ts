/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantItemGroups } from '@kbn/aiops-test-utils/artificial_logs/significant_item_groups';
import { significantTerms } from '@kbn/aiops-test-utils/artificial_logs/significant_terms';

import { duplicateIdentifier } from './duplicate_identifier';
import { getGroupsWithReaddedDuplicates } from './get_groups_with_readded_duplicates';
import { groupDuplicates } from './fetch_frequent_item_sets';
import { getFieldValuePairCounts } from './get_field_value_pair_counts';
import { getMarkedDuplicates } from './get_marked_duplicates';
import { getMissingSignificantItems } from './get_missing_significant_items';

describe('getMissingSignificantItems', () => {
  it('get missing significant items', () => {
    const groupedSignificantItems = groupDuplicates(significantTerms, duplicateIdentifier).filter(
      (g) => g.group.length > 1
    );

    const fieldValuePairCounts = getFieldValuePairCounts(significantItemGroups);
    const markedDuplicates = getMarkedDuplicates(significantItemGroups, fieldValuePairCounts);
    const groupsWithReaddedDuplicates = getGroupsWithReaddedDuplicates(
      markedDuplicates,
      groupedSignificantItems
    );

    const missingSignificantItems = getMissingSignificantItems(
      significantTerms,
      groupsWithReaddedDuplicates
    );

    expect(missingSignificantItems).toEqual([
      {
        key: 'user:Peter',
        type: 'keyword',
        bg_count: 553,
        doc_count: 1981,
        fieldName: 'user',
        fieldValue: 'Peter',
        normalizedScore: 0.8328439168064725,
        pValue: 2.62555579103777e-21,
        score: 47.38899434932384,
        total_bg_count: 1975,
        total_doc_count: 4669,
      },
      {
        key: 'url:login.php',
        type: 'keyword',
        bg_count: 632,
        doc_count: 1738,
        fieldName: 'url',
        fieldValue: 'login.php',
        normalizedScore: 0.07472703283204607,
        pValue: 0.012783309213417932,
        score: 4.359614926663956,
        total_bg_count: 1975,
        total_doc_count: 4669,
      },
    ]);
  });
});
