/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet } from '@kbn/ml-agg-utils';

import type { SimpleHierarchicalTreeBuildIndexes } from './build_simple_hierarchical_tree_indexes';
import { getValueCountsForItemSetIndexes } from './get_value_counts';

function getSubsetKey(
  itemSetIndexes: number[],
  treeBuildIndexes: SimpleHierarchicalTreeBuildIndexes
): string {
  const cachedSubsetKey = treeBuildIndexes.subsetKeyByItemSetIndexes.get(itemSetIndexes);
  if (cachedSubsetKey !== undefined) {
    return cachedSubsetKey;
  }

  const subsetKey = itemSetIndexes.join(',');
  treeBuildIndexes.subsetKeyByItemSetIndexes.set(itemSetIndexes, subsetKey);
  return subsetKey;
}

export function getValueCountsForField(
  itemSets: ItemSet[],
  itemSetIndexes: number[],
  field: string,
  treeBuildIndexes: SimpleHierarchicalTreeBuildIndexes
): Record<string, number> {
  const cacheKey = JSON.stringify([field, getSubsetKey(itemSetIndexes, treeBuildIndexes)]);

  const cachedValueCounts = treeBuildIndexes.valueCountsByFieldAndSubsetKey.get(cacheKey);
  if (cachedValueCounts !== undefined) {
    return cachedValueCounts;
  }

  const computedValueCounts = getValueCountsForItemSetIndexes(itemSets, itemSetIndexes, field);

  treeBuildIndexes.valueCountsByFieldAndSubsetKey.set(cacheKey, computedValueCounts);
  return computedValueCounts;
}
