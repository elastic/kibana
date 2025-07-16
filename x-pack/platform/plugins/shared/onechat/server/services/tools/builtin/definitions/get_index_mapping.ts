/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { builtinToolIds, builtinTags } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { getIndexMappings, GetIndexMappingsResult } from '@kbn/onechat-genai-utils';

const getIndexMappingsSchema = z.object({
  indices: z.array(z.string()).min(1).describe('List of indices to retrieve mappings for.'),
});

export const getIndexMappingsTool = (): BuiltinToolDefinition<
  typeof getIndexMappingsSchema,
  GetIndexMappingsResult
> => {
  return {
    id: builtinToolIds.getIndexMapping,
    description: 'Retrieve mappings for the specified index or indices.',
    schema: getIndexMappingsSchema,
    handler: async ({ indices }, { esClient }) => {
      const result = await getIndexMappings({ indices, esClient: esClient.asCurrentUser });
      return {
        result,
      };
    },
    tags: [builtinTags.retrieval],
  };
};
