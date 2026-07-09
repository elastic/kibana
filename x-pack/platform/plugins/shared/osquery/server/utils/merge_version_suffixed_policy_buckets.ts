/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PolicyBucket {
  id: string;
  name: string;
  size: number;
}

/**
 * Merges `policy_id` aggregation buckets that differ only by Fleet's
 * version-specific suffix (`<policyId>#<major.minor>`) back into their base
 * policy id, summing bucket sizes.
 *
 * Without this, a policy with both suffixed and unsuffixed agents shows up as
 * multiple entries in aggregation results, one of which is keyed by the raw
 * (unresolvable) suffixed id and fails the subsequent agent-policy name
 * lookup by base id.
 */
export const mergeVersionSuffixedPolicyBuckets = (buckets: PolicyBucket[]): PolicyBucket[] => {
  const merged = new Map<string, PolicyBucket>();

  for (const bucket of buckets) {
    const baseId = bucket.id.split('#')[0];
    const existing = merged.get(baseId);

    merged.set(baseId, {
      id: baseId,
      name: baseId,
      size: (existing?.size ?? 0) + bucket.size,
    });
  }

  return Array.from(merged.values());
};
