/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { cleanupMapping } from './cleanup_mapping';

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
  const response = await esClient.indices.getMapping({
    index: indices,
  });

  return Object.entries(response).reduce((res, [indexName, mappingRes]) => {
    res[indexName] = {
      mappings: cleanup ? cleanupMapping(mappingRes.mappings) : mappingRes.mappings,
    };
    return res;
  }, {} as GetIndexMappingsResult);
};
