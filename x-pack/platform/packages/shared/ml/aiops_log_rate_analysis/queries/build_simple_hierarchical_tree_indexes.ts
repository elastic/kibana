/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet, SignificantItem } from '@kbn/ml-agg-utils';

import { getFieldValuePairKey } from './get_field_value_pair_key';

export interface SimpleHierarchicalTreeBuildIndexes {
  significantItemByPairKey: Map<string, SignificantItem>;
  itemSetIndexesByPairKey: Map<string, number[]>;
  valueCountsByFieldAndSubsetKey: Map<string, Record<string, number>>;
  subsetKeyByItemSetIndexes: WeakMap<number[], string>;
}

export function buildSimpleHierarchicalTreeIndexes(
  itemSets: ItemSet[],
  significantItems: SignificantItem[]
): SimpleHierarchicalTreeBuildIndexes {
  const significantItemByPairKey = new Map<string, SignificantItem>();
  for (const significantItem of significantItems) {
    const pairKey = getFieldValuePairKey(significantItem.fieldName, significantItem.fieldValue);
    if (!significantItemByPairKey.has(pairKey)) {
      significantItemByPairKey.set(pairKey, significantItem);
    }
  }

  const itemSetIndexesByPairKey = new Map<string, number[]>();
  itemSets.forEach((itemSet, itemSetIndex) => {
    const itemSetPairKeys = new Set<string>();

    for (const { fieldName, fieldValue } of itemSet.set) {
      const pairKey = getFieldValuePairKey(fieldName, fieldValue);
      if (itemSetPairKeys.has(pairKey)) {
        continue;
      }
      itemSetPairKeys.add(pairKey);

      const itemSetIndexes = itemSetIndexesByPairKey.get(pairKey);
      if (itemSetIndexes === undefined) {
        itemSetIndexesByPairKey.set(pairKey, [itemSetIndex]);
      } else {
        itemSetIndexes.push(itemSetIndex);
      }
    }
  });

  return {
    significantItemByPairKey,
    itemSetIndexesByPairKey,
    valueCountsByFieldAndSubsetKey: new Map<string, Record<string, number>>(),
    subsetKeyByItemSetIndexes: new WeakMap<number[], string>(),
  };
}
