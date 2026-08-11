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

/**
 * Precomputes lookup indexes and caches used while building the simple
 * hierarchical tree.
 *
 * The tree builder repeatedly needs to:
 * - resolve a field/value pair to its `SignificantItem` metadata,
 * - find which frequent item sets contain a given field/value pair,
 * - cache per-field value counts for the current subset of item sets.
 *
 * Building these maps once up front avoids rescanning the full `itemSets`
 * array at each depth-first-search step.
 */
export function buildSimpleHierarchicalTreeIndexes(
  itemSets: ItemSet[],
  significantItems: SignificantItem[]
): SimpleHierarchicalTreeBuildIndexes {
  // Maps a field/value pair to the corresponding significant item metadata
  // used when materializing tree nodes.
  const significantItemByPairKey = new Map<string, SignificantItem>();
  for (const significantItem of significantItems) {
    const pairKey = getFieldValuePairKey(significantItem.fieldName, significantItem.fieldValue);
    if (!significantItemByPairKey.has(pairKey)) {
      significantItemByPairKey.set(pairKey, significantItem);
    }
  }

  // Inverted index from field/value pair to the item set indexes containing it.
  // DFS intersects these posting lists with the current subset to narrow a branch.
  const itemSetIndexesByPairKey = new Map<string, number[]>();
  itemSets.forEach((itemSet, itemSetIndex) => {
    // Prevent duplicate field/value pairs within the same item set from adding
    // the same item set index multiple times to a posting list.
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
    // Cache of field value counts for a specific field within a specific subset
    // of item sets, reused across recursive tree traversal.
    valueCountsByFieldAndSubsetKey: new Map<string, Record<string, number>>(),
    // Cache of the serialized subset key for an item set index array, used
    // when building keys for the value-count cache above.
    subsetKeyByItemSetIndexes: new WeakMap<number[], string>(),
  };
}
