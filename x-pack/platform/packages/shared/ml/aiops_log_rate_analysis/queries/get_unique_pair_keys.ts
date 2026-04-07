/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItemGroup } from '@kbn/ml-agg-utils';

import { getFieldValuePairKey } from './get_field_value_pair_key';

export function getUniquePairKeys(group: SignificantItemGroup['group']): string[] {
  const uniquePairKeys: string[] = [];
  const seenPairKeys = new Set<string>();

  for (const { fieldName, fieldValue } of group) {
    const pairKey = getFieldValuePairKey(fieldName, fieldValue);
    if (seenPairKeys.has(pairKey)) {
      continue;
    }

    seenPairKeys.add(pairKey);
    uniquePairKeys.push(pairKey);
  }

  return uniquePairKeys;
}
