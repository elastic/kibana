/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { significantTerms } from '@kbn/aiops-test-utils/artificial_logs/significant_terms';

import { duplicateIdentifier } from './duplicate_identifier';
import { groupDuplicates } from './fetch_frequent_item_sets';
import { transformSignificantItemToGroup } from './transform_significant_item_to_group';

describe('transformSignificantItemToGroup', () => {
  it('transforms a significant item into a standalone group', () => {
    const groupedSignificantItems = groupDuplicates(significantTerms, duplicateIdentifier).filter(
      (g) => g.group.length > 1
    );

    const significantItem = significantTerms.find(
      ({ fieldName, fieldValue }) => fieldName === 'user' && fieldValue === 'Peter'
    );
    expect(significantItem).toBeDefined();
    if (!significantItem) {
      throw new Error('Expected user:Peter significant item to exist');
    }

    const transformed = transformSignificantItemToGroup(significantItem, groupedSignificantItems);

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
