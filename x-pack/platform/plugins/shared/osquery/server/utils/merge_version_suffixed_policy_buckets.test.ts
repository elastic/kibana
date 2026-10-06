/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeVersionSuffixedPolicyBuckets } from './merge_version_suffixed_policy_buckets';

describe('mergeVersionSuffixedPolicyBuckets', () => {
  it('leaves unsuffixed, distinct buckets untouched, sorted by size descending', () => {
    expect(
      mergeVersionSuffixedPolicyBuckets([
        { id: 'policy-1', name: 'policy-1', size: 2 },
        { id: 'policy-2', name: 'policy-2', size: 3 },
      ])
    ).toEqual([
      { id: 'policy-2', name: 'policy-2', size: 3 },
      { id: 'policy-1', name: 'policy-1', size: 2 },
    ]);
  });

  it('does not merge a distinct policy whose id contains a non-version "#" suffix', () => {
    expect(
      mergeVersionSuffixedPolicyBuckets([
        { id: 'policy', name: 'policy', size: 2 },
        { id: 'policy#123', name: 'policy#123', size: 3 },
      ])
    ).toEqual([
      { id: 'policy#123', name: 'policy#123', size: 3 },
      { id: 'policy', name: 'policy', size: 2 },
    ]);
  });

  it('re-sorts a merged bucket to reflect its new combined size', () => {
    expect(
      mergeVersionSuffixedPolicyBuckets([
        { id: 'policy-1', name: 'policy-1', size: 1 },
        { id: 'policy-1#9.4', name: 'policy-1#9.4', size: 1 },
        { id: 'policy-2', name: 'policy-2', size: 1 },
      ])
    ).toEqual([
      { id: 'policy-1', name: 'policy-1', size: 2 },
      { id: 'policy-2', name: 'policy-2', size: 1 },
    ]);
  });

  it('merges a suffixed variant into its base policy id, summing size', () => {
    expect(
      mergeVersionSuffixedPolicyBuckets([
        { id: 'policy-1', name: 'policy-1', size: 2 },
        { id: 'policy-1#9.4', name: 'policy-1#9.4', size: 5 },
      ])
    ).toEqual([{ id: 'policy-1', name: 'policy-1', size: 7 }]);
  });

  it('normalizes to the base id even when only a suffixed variant exists', () => {
    expect(
      mergeVersionSuffixedPolicyBuckets([{ id: 'policy-1#9.4', name: 'policy-1#9.4', size: 4 }])
    ).toEqual([{ id: 'policy-1', name: 'policy-1', size: 4 }]);
  });

  it('merges multiple suffixed variants of the same base policy', () => {
    expect(
      mergeVersionSuffixedPolicyBuckets([
        { id: 'policy-1', name: 'policy-1', size: 1 },
        { id: 'policy-1#8.9', name: 'policy-1#8.9', size: 2 },
        { id: 'policy-1#9.4', name: 'policy-1#9.4', size: 3 },
      ])
    ).toEqual([{ id: 'policy-1', name: 'policy-1', size: 6 }]);
  });

  it('orders equal-size buckets by id for a stable result', () => {
    expect(
      mergeVersionSuffixedPolicyBuckets([
        { id: 'policy-b', name: 'policy-b', size: 1 },
        { id: 'policy-a', name: 'policy-a', size: 1 },
      ])
    ).toEqual([
      { id: 'policy-a', name: 'policy-a', size: 1 },
      { id: 'policy-b', name: 'policy-b', size: 1 },
    ]);
  });

  it('returns an empty array for no buckets', () => {
    expect(mergeVersionSuffixedPolicyBuckets([])).toEqual([]);
  });
});
