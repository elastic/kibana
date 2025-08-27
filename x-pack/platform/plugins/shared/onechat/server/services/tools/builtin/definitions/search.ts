/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { builtinToolIds, builtinTags } from '@kbn/onechat-common';
import { runSearchTool } from '@kbn/onechat-genai-utils/tools';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';

const searchSchema = z.object({
  query: z.string().describe('A natural language query expressing the search request'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index to search against. If not provided, will automatically select the best index to use based on the query.'
    ),
});

export const searchTool = (): BuiltinToolDefinition<typeof searchSchema> => {
  return {
    id: builtinToolIds.search,
    description: `A powerful tool for searching and analyzing data within a specific Elasticsearch index.
                 It supports both full-text relevance searches and structured analytical queries.

                 Use this tool for any query that involves finding documents, counting, aggregating, or summarizing data from a known index.

                 Examples of queries:
                 - "find articles about serverless architecture"
                 - "search for support tickets mentioning 'billing issue' or 'refund request'"
                 - "what is our policy on parental leave?"
                 - "list all products where the category is 'electronics'"
                 - "show me the last 5 documents from that index"
                 - "show me the sales over the last year break down by month"

                 Note:
                 - The 'index' parameter can be used to specify which index to search against.
                   If not provided, the tool will use the index explorer to find the best index to use.
                 - It is perfectly fine not to not specify the 'index' parameter. It should only be specified when you already
                   know about the index and fields you want to search on, e.g. if the user explicitly specified it.
    `,
    schema: searchSchema,
    handler: async ({ query: nlQuery, index = '*' }, { esClient, modelProvider }) => {
      const results = await runSearchTool({
        nlQuery,
        index,
        esClient: esClient.asCurrentUser,
        model: await modelProvider.getDefaultModel(),
      });
      return { results };
    },
    tags: [builtinTags.retrieval],
  };
};
