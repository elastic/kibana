/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsShardStats } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';

export const hasIndexMonitorPrivilege = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<boolean> => {
  try {
    const { has_all_requested: hasAllRequested } =
      await client.asCurrentUser.security.hasPrivileges({
        index: [{ names: [indexName], privileges: ['monitor'] }],
      });

    return hasAllRequested;
  } catch {
    return false;
  }
};

const shardVectorCount = (shard: IndicesStatsShardStats): number =>
  (shard.dense_vector?.value_count ?? 0) + (shard.sparse_vector?.value_count ?? 0);

/**
 * Counts indexed dense + sparse vectors, counting each logical shard exactly once.
 * In stateless 'total' and 'primaries' can both return the wrong counts because they might not be loaded onto nodes.
 * Returns null when not all shards responded.
 */
export const fetchIndexVectorCount = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<number | null> => {
  const { _shards: shards, indices } = await client.asInternalUser.indices.stats({
    expand_wildcards: 'none',
    index: indexName,
    level: 'shards',
    metric: ['dense_vector', 'sparse_vector'],
    filter_path: [
      '_shards',
      'indices.*.shards.*.dense_vector.value_count',
      'indices.*.shards.*.sparse_vector.value_count',
    ],
  });

  if (!shards || shards.successful !== shards.total) {
    return null;
  }

  let count = 0;
  for (const index of Object.values(indices ?? {})) {
    for (const copies of Object.values(index.shards ?? {})) {
      if (copies.length > 0) {
        count += Math.max(...copies.map(shardVectorCount));
      }
    }
  }
  return count;
};
