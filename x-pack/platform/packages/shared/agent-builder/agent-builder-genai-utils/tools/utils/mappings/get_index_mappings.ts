/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { cleanupMapping } from './cleanup_mapping';
import { batchByUrlLength } from '../batch_by_url_length';

export interface GetIndexMappingEntry {
  mappings: MappingTypeMapping;
}

export type GetIndexMappingsResult = Record<string, GetIndexMappingEntry>;

/**
 * Returns the mappings for each of the given indices.
 */
export const getIndexMappings = async ({
  indices,
  cleanup = true,
  esClient,
}: {
  indices: string[];
  cleanup?: boolean;
  esClient: ElasticsearchClient;
}): Promise<GetIndexMappingsResult> => {
  const batches = batchByUrlLength(indices);

  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const response = await esClient.indices.getMapping({
        index: batch,
      });

      return Object.entries(response).reduce((res, [indexName, mappingRes]) => {
        res[indexName] = {
          mappings: cleanup ? cleanupMapping(mappingRes.mappings) : mappingRes.mappings,
        };
        return res;
      }, {} as GetIndexMappingsResult);
    })
  );

  return Object.assign({}, ...batchResults);
};
