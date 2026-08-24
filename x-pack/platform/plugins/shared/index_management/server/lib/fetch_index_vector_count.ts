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

/**
 * Whether the caller may read stats for the given index. The count itself is read with elevated
 * privileges, so Elasticsearch will not reject an unprivileged caller on its own and the route has
 * to ask on their behalf. Errors deny access rather than granting it.
 */
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

/**
 * Counts the dense and sparse vector values indexed in an index. Reads `_stats`, which is
 * operator-only in serverless and so runs as the internal user. Callers must gate it on
 * `hasIndexMonitorPrivilege` first. Primaries only, otherwise replicas are counted twice.
 */
export const fetchIndexVectorCount = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<number> => {
  const { _all: all } = await client.asInternalUser.indices.stats({
    index: indexName,
    level: 'cluster',
    metric: ['dense_vector', 'sparse_vector'],
  });

  const primaries = all?.primaries as IndexStatsWithVectors | undefined;

  return (primaries?.dense_vector?.value_count ?? 0) + (primaries?.sparse_vector?.value_count ?? 0);
};
