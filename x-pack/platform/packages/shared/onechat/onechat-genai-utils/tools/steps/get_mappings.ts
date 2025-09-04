/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { cleanupMapping } from '../utils';

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

export interface GetDataStreamMappingEntry {
  mappings: MappingTypeMapping;
}

export type GetDataStreamMappingsResults = Record<string, GetDataStreamMappingEntry>;

export interface GetDataStreamMappingsResItem {
  name: string;
  // in the documentation the mappings are supposed to be directly under that prop,
  // in practice it's under a _doc property, so we check both just in case.
  effective_mappings:
    | MappingTypeMapping
    | {
        _doc: MappingTypeMapping;
      };
}

export interface GetDataStreamMappingsRes {
  data_streams: GetDataStreamMappingsResItem[];
}

/**
 * Returns the mappings for each of the given datastreams.
 */
export const getDataStreamMappings = async ({
  datastreams,
  cleanup = true,
  esClient,
}: {
  datastreams: string[];
  cleanup?: boolean;
  esClient: ElasticsearchClient;
}): Promise<GetDataStreamMappingsResults> => {
  const response = await esClient.transport.request<GetDataStreamMappingsRes>({
    path: `/_data_stream/${datastreams.join(',')}/_mappings`,
    method: 'GET',
  });

  return response.data_streams.reduce((res, datastream) => {
    const mappings =
      '_doc' in datastream.effective_mappings
        ? datastream.effective_mappings._doc
        : datastream.effective_mappings;
    res[datastream.name] = {
      mappings: cleanup ? cleanupMapping(mappings) : mappings,
    };
    return res;
  }, {} as GetDataStreamMappingsResults);
};
