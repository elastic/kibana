/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasSortedValue } from './has_sorted_value';

export function isSubsetOfAcceptedLeaves(
  pairKeys: string[],
  acceptedLeafIndexesByPairKey: Map<string, number[]>,
  acceptedLeavesCount: number
): boolean {
  if (pairKeys.length === 0) {
    return acceptedLeavesCount > 0;
  }

  const postingsByPairKey: number[][] = [];
  for (const pairKey of pairKeys) {
    const postings = acceptedLeafIndexesByPairKey.get(pairKey);
    if (postings === undefined || postings.length === 0) {
      return false;
    }
    postingsByPairKey.push(postings);
  }

  postingsByPairKey.sort(
    (leftPostings, rightPostings) => leftPostings.length - rightPostings.length
  );
  const [smallestPostings, ...otherPostings] = postingsByPairKey;

  for (const acceptedLeafIndex of smallestPostings) {
    if (otherPostings.every((postings) => hasSortedValue(postings, acceptedLeafIndex))) {
      return true;
    }
  }

  return false;
}
