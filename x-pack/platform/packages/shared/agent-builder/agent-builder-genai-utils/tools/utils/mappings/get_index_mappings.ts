/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import pLimit from 'p-limit';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { cleanupMapping } from './cleanup_mapping';
import { batchByUrlLength } from '../batch_by_url_length';

export interface GetIndexMappingEntry {
  mappings: MappingTypeMapping;
}

export type GetIndexMappingsResult = Record<string, GetIndexMappingEntry>;

const isAuthorizationError = (err: unknown): boolean =>
  err instanceof esErrors.ResponseError && err.statusCode === 403;

/**
 * Returns the mappings for each of the given indices.
 */
export const getIndexMappings = async ({
  indices,
  cleanup = true,
  skipUnauthorized = false,
  esClient,
}: {
  indices: string[];
  cleanup?: boolean;
  skipUnauthorized?: boolean;
  esClient: ElasticsearchClient;
}): Promise<GetIndexMappingsResult> => {
  const batches = batchByUrlLength(indices);

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      try {
        const response = await esClient.indices.getMapping({ index: batch });
        return Object.entries(response).reduce((res, [indexName, mappingRes]) => {
          res[indexName] = {
            mappings: cleanup ? cleanupMapping(mappingRes.mappings) : mappingRes.mappings,
          };
          return res;
        }, {} as GetIndexMappingsResult);
      } catch (err) {
        if (!skipUnauthorized || !isAuthorizationError(err)) {
          throw err;
        }
        // Retry per-index (concurrency-limited) and drop any that are denied.
        const limit = pLimit(5);
        const settled = await Promise.allSettled(
          batch.map((indexName) =>
            limit(async () => {
              const response = await esClient.indices.getMapping({ index: [indexName] });
              return { indexName, mappings: response[indexName].mappings };
            })
          )
        );
        return settled.reduce((res, result) => {
          if (result.status === 'fulfilled') {
            const { indexName, mappings } = result.value;
            res[indexName] = {
              mappings: cleanup ? cleanupMapping(mappings) : mappings,
            };
          }
          return res;
        }, {} as GetIndexMappingsResult);
      }
    })
  );

  return Object.assign({}, ...batchResults);
};
