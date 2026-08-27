/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';

interface VectorStats {
  value_count?: number;
}

// `dense_vector` and `sparse_vector` are missing from the stats types for this level of the
// response, though Elasticsearch returns them.
interface IndexStatsWithVectors {
  dense_vector?: VectorStats;
  sparse_vector?: VectorStats;
}

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

export const fetchIndexVectorCount = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<number> => {
  const { _all: all } = await client.asInternalUser.indices.stats({
    expand_wildcards: 'none',
    index: indexName,
    level: 'cluster',
    metric: ['dense_vector', 'sparse_vector'],
  });

  const total = all?.total as IndexStatsWithVectors | undefined;

  return (total?.dense_vector?.value_count ?? 0) + (total?.sparse_vector?.value_count ?? 0);
};
