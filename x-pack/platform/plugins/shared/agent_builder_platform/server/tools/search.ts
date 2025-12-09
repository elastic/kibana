/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { runSearchTool } from '@kbn/agent-builder-genai-utils/tools';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';

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
    id: platformCoreTools.search,
    type: ToolType.builtin,
    description: `A powerful tool for searching and analyzing data within your Elasticsearch cluster.
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
 If not provided, the tool will decide itself which is the best index to use.
- It is perfectly fine not to specify the 'index' parameter. It should only be specified when you already
 know about the index and fields you want to search on, e.g. if the user explicitly specified it.
    `,
    schema: searchSchema,
    handler: async (
      { query: nlQuery, index = '*' },
      { esClient, modelProvider, logger, events }
    ) => {
      logger.debug(`search tool called with query: ${nlQuery}, index: ${index}`);
      const results = await runSearchTool({
        nlQuery,
        index,
        esClient: esClient.asCurrentUser,
        model: await modelProvider.getDefaultModel(),
        events,
        logger,
      });
      return { results };
    },
    tags: [],
  };
};
