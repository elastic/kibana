/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';

const getIndexMappingsSchema = z.object({
  indices: z.array(z.string()).min(1).describe('List of indices to retrieve mappings for.'),
});

export interface GetIndexMappingEntry {
  mappings: MappingTypeMapping;
}

export type GetIndexMappingsResult = Record<string, GetIndexMappingEntry>;

export const getIndexMappingsTool = (): RegisteredTool<
  typeof getIndexMappingsSchema,
  GetIndexMappingsResult
> => {
  return {
    id: OnechatToolIds.getIndexMapping,
    description: 'Retrieve mappings for the specified index or indices.',
    schema: getIndexMappingsSchema,
    handler: async ({ indices }, { esClient }) => {
      return getIndexMappings({ indices, esClient: esClient.asCurrentUser });
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};

export const getIndexMappings = async ({
  indices,
  esClient,
}: {
  indices: string[];
  esClient: ElasticsearchClient;
}): Promise<GetIndexMappingsResult> => {
  const response = await esClient.indices.getMapping({
    index: indices,
  });

  return Object.entries(response).reduce((res, [indexName, mappingRes]) => {
    res[indexName] = { mappings: cleanupMapping(mappingRes.mappings) };
    return res;
  }, {} as GetIndexMappingsResult);
};

/**
 * Remove non-relevant mapping information such as `ignore_above` to reduce overall token length of response
 * @param mapping
 */
const cleanupMapping = (mapping: MappingTypeMapping): MappingTypeMapping => {
  const recurseKeys = ['properties', 'fields'];
  const fieldsToKeep = ['type', 'dynamic', '_meta', 'enabled'];

  function recursiveCleanup(obj: Record<string, any>): Record<string, any> {
    if (Array.isArray(obj)) {
      return obj.map((item) => recursiveCleanup(item));
    } else if (obj !== null && typeof obj === 'object') {
      const cleaned: Record<string, any> = {};

      for (const key of Object.keys(obj)) {
        if (recurseKeys.includes(key)) {
          const value = obj[key];
          if (value !== null && typeof value === 'object') {
            // For properties/fields: preserve all keys inside
            const subCleaned: Record<string, any> = {};
            for (const fieldName of Object.keys(value)) {
              subCleaned[fieldName] = recursiveCleanup(value[fieldName]);
            }
            cleaned[key] = subCleaned;
          }
        } else if (fieldsToKeep.includes(key)) {
          cleaned[key] = recursiveCleanup(obj[key]);
        }
      }

      return cleaned;
    } else {
      return obj;
    }
  }

  return recursiveCleanup(mapping);
};
