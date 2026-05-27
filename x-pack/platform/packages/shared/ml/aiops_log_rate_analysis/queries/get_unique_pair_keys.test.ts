/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldValuePairKey } from './get_field_value_pair_key';
import { getUniquePairKeys } from './get_unique_pair_keys';

describe('getUniquePairKeys', () => {
  it('returns unique pair keys in first-seen order', () => {
    const group = [
      {
        key: 'status:500',
        type: 'keyword' as const,
        fieldName: 'status',
        fieldValue: 500,
        docCount: 10,
        pValue: 0.1,
      },
      {
        key: 'url:home.php',
        type: 'keyword' as const,
        fieldName: 'url',
        fieldValue: 'home.php',
        docCount: 10,
        pValue: 0.1,
      },
      {
        key: 'status:500',
        type: 'keyword' as const,
        fieldName: 'status',
        fieldValue: 500,
        docCount: 10,
        pValue: 0.1,
      },
    ];

    expect(getUniquePairKeys(group)).toEqual([
      getFieldValuePairKey('status', 500),
      getFieldValuePairKey('url', 'home.php'),
    ]);
  });
});
