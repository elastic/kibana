/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemSet } from '@kbn/ml-agg-utils';

import type { SimpleHierarchicalTreeBuildIndexes } from './build_simple_hierarchical_tree_indexes';
import { getValueCountsForItemSetIndexes } from './get_value_counts';

/**
 * Returns a stable string key for an item set index subset and caches it for
 * reuse while that subset array is still referenced.
 */
function getSubsetKey(
  itemSetIndexes: number[],
  treeBuildIndexes: SimpleHierarchicalTreeBuildIndexes
): string {
  // Cache the serialized form of a subset so repeated lookups for the same
  // subset array can reuse the same cache key.
  const cachedSubsetKey = treeBuildIndexes.subsetKeyByItemSetIndexes.get(itemSetIndexes);
  if (cachedSubsetKey !== undefined) {
    return cachedSubsetKey;
  }

  const subsetKey = itemSetIndexes.join(',');
  treeBuildIndexes.subsetKeyByItemSetIndexes.set(itemSetIndexes, subsetKey);
  return subsetKey;
}

/**
 * Returns counts of values for a field within the provided subset of item sets.
 *
 * Results are cached by field name and subset so repeated DFS steps can reuse
 * previously computed counts instead of rescanning the same item sets.
 */
export function getValueCountsForField(
  itemSets: ItemSet[],
  itemSetIndexes: number[],
  field: string,
  treeBuildIndexes: SimpleHierarchicalTreeBuildIndexes
): Record<string, number> {
  // Cache by both field and current subset because the same field can produce
  // different value counts depending on which branch of the tree we're in.
  const cacheKey = JSON.stringify([field, getSubsetKey(itemSetIndexes, treeBuildIndexes)]);

  const cachedValueCounts = treeBuildIndexes.valueCountsByFieldAndSubsetKey.get(cacheKey);
  if (cachedValueCounts !== undefined) {
    return cachedValueCounts;
  }

  const computedValueCounts = getValueCountsForItemSetIndexes(itemSets, itemSetIndexes, field);

  treeBuildIndexes.valueCountsByFieldAndSubsetKey.set(cacheKey, computedValueCounts);
  return computedValueCounts;
}
