/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import type { SignificantItemGroup } from '@kbn/ml-agg-utils';
import { stringHash } from '@kbn/ml-string-hash';

import type { SimpleHierarchicalTreeNode } from '../types';
import { getUniquePairKeys } from './get_unique_pair_keys';
import { isSubsetOfAcceptedLeaves } from './is_subset_of_accepted_leaves';

/**
 * Get leaves from hierarchical tree.
 */
export function getSimpleHierarchicalTreeLeaves(
  tree: SimpleHierarchicalTreeNode,
  leaves: SignificantItemGroup[]
) {
  if (tree.children.length === 0) {
    leaves.push({
      id: `${stringHash(JSON.stringify(tree.set))}`,
      group: tree.set,
      docCount: tree.docCount,
      pValue: tree.pValue,
    });
  } else {
    for (const child of tree.children) {
      const newLeaves = getSimpleHierarchicalTreeLeaves(child, []);
      if (newLeaves.length > 0) {
        leaves.push(...newLeaves);
      }
    }
  }

  if (leaves.length === 1 && leaves[0].group.length === 0 && leaves[0].docCount === 0) {
    return [];
  }

  // Sort by length of group items to make sure in the `reduce` afterwards to add larger groups first.
  const sortedLeaves = orderBy(leaves, [(d) => d.group.length], ['desc']);

  // Checks if a group is a subset of items already present in a larger group.
  // `acceptedLeafIndexesByPairKey` lets us look up which accepted leaves contain
  // each field/value pair, avoiding nested scans across all accepted groups.
  const acceptedLeafIndexesByPairKey = new Map<string, number[]>();
  const filteredLeaves = sortedLeaves.reduce<SignificantItemGroup[]>(
    (acceptedLeaves, candidateLeaf) => {
      const candidatePairKeys = getUniquePairKeys(candidateLeaf.group);
      const isSubset = isSubsetOfAcceptedLeaves(
        candidatePairKeys,
        acceptedLeafIndexesByPairKey,
        acceptedLeaves.length
      );

      if (!isSubset) {
        const acceptedLeafIndex = acceptedLeaves.length;
        acceptedLeaves.push(candidateLeaf);

        for (const pairKey of candidatePairKeys) {
          const postings = acceptedLeafIndexesByPairKey.get(pairKey);
          if (postings === undefined) {
            acceptedLeafIndexesByPairKey.set(pairKey, [acceptedLeafIndex]);
          } else {
            postings.push(acceptedLeafIndex);
          }
        }
      }

      return acceptedLeaves;
    },
    []
  );

  return filteredLeaves;
}
