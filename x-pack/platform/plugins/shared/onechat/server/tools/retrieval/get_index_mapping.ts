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

export type GetIndexMappingsResult = Record<string, { mappings: MappingTypeMapping }>;

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
  return response;
};
