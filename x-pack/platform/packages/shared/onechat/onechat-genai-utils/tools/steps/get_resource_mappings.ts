/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { getIndexMappings, getDatastreamMappings } from './get_mappings';

interface GetResourceMappingsResponse {
  mappings: MappingTypeMapping;
}

/**
 * Retrieve the mapping for a single resource (index, alias or datastream)
 */
export const getResourceMappings = async ({
  resourceName,
  esClient,
}: {
  resourceName: string;
  esClient: ElasticsearchClient;
}): Promise<GetResourceMappingsResponse> => {
  if (resourceName.includes(',') || resourceName.includes('*')) {
    throw new Error(
      `Tried to retrieve resource mapping for multiple resources using pattern ${resourceName}`
    );
  }

  try {
    const resolveRes = await esClient.indices.resolveIndex({
      name: [resourceName],
      allow_no_indices: false,
    });

    if (resolveRes.indices.length > 0) {
      const indexName = resolveRes.indices[0].name;
      const mappings = await getIndexMappings({ indices: [indexName], esClient, cleanup: true });
      return {
        mappings: mappings[indexName].mappings,
      };
    }
    if (resolveRes.data_streams.length > 0) {
      const datastrean = resolveRes.data_streams[0].name;
      const mappings = await getDatastreamMappings({
        datastreams: [datastrean],
        esClient,
        cleanup: true,
      });
      return {
        mappings: mappings[datastrean].mappings,
      };
    }
    if (resolveRes.aliases.length > 0) {
      // TODO
      return {
        mappings: { properties: {} },
      };
    }
  } catch (e) {
    if (isNotFoundError(e)) {
      throw new Error(`No resource found for '${resourceName}'`);
    }
    throw e;
  }

  throw new Error(`No resource found for pattern ${resourceName}`);
};
