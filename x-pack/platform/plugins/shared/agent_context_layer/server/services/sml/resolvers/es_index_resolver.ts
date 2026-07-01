/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { SmlResolver, SmlResolverItem } from './types';

export const ES_INDEX_RESOLVER_TYPE = 'es_index';

/**
 * Validate an `es_index` resolver path. The path is the index (or pattern)
 * name and may NOT contain `/` — we use `/` exclusively as a structural
 * separator in resolver paths and ES index names cannot legally contain it
 * anyway.
 */
export const parseEsIndexResolverPath = (originPath: string): { index: string } => {
  if (!originPath || originPath.includes('/')) {
    throw new Error(
      `Invalid es_index resolver path '${originPath}': expected an index name without '/'`
    );
  }
  return { index: originPath };
};

/**
 * Built-in resolver for Elasticsearch index mappings.
 *
 * `origin_id` form: `es_index://<index>`.
 *
 * Permissions: ES index-level `view_index_metadata` on the index, encoded
 * as `es-index:<index>:view_index_metadata`. This is the minimum privilege
 * required to read mappings via `indices.getMapping` and matches the
 * privilege ES itself checks for the operation.
 */
export const createEsIndexResolver = (): SmlResolver => ({
  type: ES_INDEX_RESOLVER_TYPE,

  getPermissions: (originPath) => {
    const { index } = parseEsIndexResolverPath(originPath);
    return [`es-index:${index}:view_index_metadata`];
  },

  getItem: async (
    originPath,
    context
  ): Promise<
    SmlResolverItem<{ index: string; mappings: Record<string, MappingTypeMapping> }> | undefined
  > => {
    const { index } = parseEsIndexResolverPath(originPath);
    try {
      const response = await context.esClient.asCurrentUser.indices.getMapping({ index });
      const mappings: Record<string, MappingTypeMapping> = {};
      for (const [indexName, value] of Object.entries(response)) {
        if (value?.mappings) {
          mappings[indexName] = value.mappings;
        }
      }
      if (Object.keys(mappings).length === 0) {
        return undefined;
      }
      return {
        type: ES_INDEX_RESOLVER_TYPE,
        path: originPath,
        data: { index, mappings },
      };
    } catch (error) {
      context.logger.debug(
        `es_index resolver: failed to read mappings for '${index}': ${(error as Error).message}`
      );
      return undefined;
    }
  },
});
