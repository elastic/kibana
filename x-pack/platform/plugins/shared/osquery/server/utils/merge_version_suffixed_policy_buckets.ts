/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripPolicyIdVersionSuffix } from '../../common/utils/strip_policy_id_version_suffix';

export interface PolicyBucket {
  id: string;
  name: string;
  size: number;
}

// Merges policy_id buckets that differ only by Fleet's version suffix back
// into their base id, summing sizes, then re-sorts by size since merging can
// change a policy's rank in a top-N list.
export const mergeVersionSuffixedPolicyBuckets = (buckets: PolicyBucket[]): PolicyBucket[] => {
  const merged = new Map<string, PolicyBucket>();

  for (const bucket of buckets) {
    const baseId = stripPolicyIdVersionSuffix(bucket.id);
    const existing = merged.get(baseId);

    merged.set(baseId, {
      id: baseId,
      name: baseId,
      size: (existing?.size ?? 0) + bucket.size,
    });
  }

  return Array.from(merged.values()).sort((a, b) => b.size - a.size || a.id.localeCompare(b.id));
};
