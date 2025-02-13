/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { finalSignificantItemGroups } from '@kbn/aiops-test-utils/artificial_logs/final_significant_item_groups';

import { getGroupTableItems } from './get_group_table_items';

describe('getGroupTableItems', () => {
  it('transforms groups into table items', () => {
    const groupTableItems = getGroupTableItems(finalSignificantItemGroups);

    expect(groupTableItems).toEqual([
      {
        id: '2675980076',
        docCount: 792,
        pValue: 0.00974308761016614,
        uniqueItemsCount: 0,
        groupItemsSortedByUniqueness: [
          {
            key: 'response_code:500',
            type: 'keyword',
            fieldName: 'response_code',
            fieldValue: '500',
            docCount: 792,
            pValue: 0.012783309213417932,
            duplicate: 2,
          },
          {
            key: 'url:home.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'home.php',
            docCount: 792,
            pValue: 0.00974308761016614,
            duplicate: 2,
          },
        ],
      },
      {
        id: '3819687732',
        docCount: 790,
        pValue: 0.012783309213417932,
        uniqueItemsCount: 0,
        groupItemsSortedByUniqueness: [
          {
            key: 'url:login.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'login.php',
            docCount: 790,
            pValue: 0.012783309213417932,
            duplicate: 2,
          },
          {
            key: 'response_code:500',
            type: 'keyword',
            fieldName: 'response_code',
            fieldValue: '500',
            docCount: 792,
            pValue: 0.012783309213417932,
            duplicate: 2,
          },
        ],
      },
      {
        id: '2091742187',
        docCount: 636,
        pValue: 0.00974308761016614,
        uniqueItemsCount: 0,
        groupItemsSortedByUniqueness: [
          {
            key: 'user:Peter',
            type: 'keyword',
            fieldName: 'user',
            fieldValue: 'Peter',
            docCount: 636,
            pValue: 0.00974308761016614,
            duplicate: 2,
          },
          {
            key: 'url:home.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'home.php',
            docCount: 792,
            pValue: 0.00974308761016614,
            duplicate: 2,
          },
        ],
      },
      {
        id: '1937394803',
        docCount: 632,
        pValue: 0.012783309213417932,
        uniqueItemsCount: 0,
        groupItemsSortedByUniqueness: [
          {
            key: 'user:Peter',
            type: 'keyword',
            fieldName: 'user',
            fieldValue: 'Peter',
            docCount: 632,
            pValue: 0.012783309213417932,
            duplicate: 2,
          },
          {
            key: 'url:login.php',
            type: 'keyword',
            fieldName: 'url',
            fieldValue: 'login.php',
            docCount: 790,
            pValue: 0.012783309213417932,
            duplicate: 2,
          },
        ],
      },
    ]);
  });
});
