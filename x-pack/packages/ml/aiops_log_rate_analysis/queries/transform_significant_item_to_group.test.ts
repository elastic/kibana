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
import { transformSignificantItemToGroup } from './transform_significant_item_to_group';

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

    const transformed = transformSignificantItemToGroup(
      missingSignificantItems[0],
      groupedSignificantItems
    );

    expect(transformed).toEqual({
      docCount: 1981,
      group: [
        {
          key: 'user:Peter',
          type: 'keyword',
          fieldName: 'user',
          fieldValue: 'Peter',
          docCount: 1981,
          duplicate: 1,
          pValue: 2.62555579103777e-21,
        },
      ],
      id: '817080373',
      pValue: 2.62555579103777e-21,
    });
  });
});
