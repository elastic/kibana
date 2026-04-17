/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSubsetOfAcceptedLeaves } from './is_subset_of_accepted_leaves';

describe('isSubsetOfAcceptedLeaves', () => {
  it('returns true when one accepted leaf contains all candidate pair keys', () => {
    const acceptedLeafIndexesByPairKey = new Map<string, number[]>([
      ['a', [0, 1]],
      ['b', [1]],
      ['c', [1, 2]],
    ]);

    expect(isSubsetOfAcceptedLeaves(['a', 'b'], acceptedLeafIndexesByPairKey, 2)).toBe(true);
    expect(isSubsetOfAcceptedLeaves(['b', 'c'], acceptedLeafIndexesByPairKey, 2)).toBe(true);
  });

  it('returns false when pair postings do not have common accepted leaf index', () => {
    const acceptedLeafIndexesByPairKey = new Map<string, number[]>([
      ['a', [0]],
      ['b', [1]],
    ]);

    expect(isSubsetOfAcceptedLeaves(['a', 'b'], acceptedLeafIndexesByPairKey, 2)).toBe(false);
  });

  it('handles empty candidate pair keys', () => {
    expect(isSubsetOfAcceptedLeaves([], new Map<string, number[]>(), 0)).toBe(false);
    expect(isSubsetOfAcceptedLeaves([], new Map<string, number[]>(), 1)).toBe(true);
  });
});
