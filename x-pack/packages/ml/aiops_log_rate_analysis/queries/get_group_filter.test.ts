/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { finalSignificantItemGroups } from '@kbn/aiops-test-utils/artificial_logs/final_significant_item_groups';

import { getGroupFilter } from './get_group_filter';

describe('getGroupFilter', () => {
  it('gets a query filter for the significant items of a group', () => {
    expect(getGroupFilter(finalSignificantItemGroups[0])).toStrictEqual([
      {
        term: {
          response_code: '500',
        },
      },
      {
        term: {
          url: 'home.php',
        },
      },
    ]);
  });
});
