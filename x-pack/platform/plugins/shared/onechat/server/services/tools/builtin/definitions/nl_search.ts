/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { builtinToolIds, builtinTags } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { naturalLanguageSearch, NaturalLanguageSearchResponse } from '@kbn/onechat-genai-utils';

const searchDslSchema = z.object({
  query: z.string().describe('A natural language query expressing the search request'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index to search against. If not provided, will use the index explorer to find the best index to use.'
    ),
  context: z
    .string()
    .optional()
    .describe('(optional) Additional context that could be useful to perform the search'),
});

export const naturalLanguageSearchTool = (): BuiltinToolDefinition<
  typeof searchDslSchema,
  NaturalLanguageSearchResponse
> => {
  return {
    id: builtinToolIds.naturalLanguageSearch,
    description: 'Run a DSL search query on one index and return matching documents.',
    schema: searchDslSchema,
    handler: async ({ query, index, context }, { esClient, modelProvider }) => {
      const model = await modelProvider.getDefaultModel();
      const result = await naturalLanguageSearch({
        query,
        context,
        index,
        model,
        esClient: esClient.asCurrentUser,
      });
      return {
        result,
      };
    },
    tags: [builtinTags.retrieval],
  };
};
