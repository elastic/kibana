/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/onechat-common';
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
  fields: z
    .array(z.string())
    .optional()
    .describe(
      '(optional) Preferred output fields to keep in the final result (for ES|QL, use KEEP). When provided, the tool will strongly bias the generated query to include ONLY these fields (plus minimal metadata like @timestamp/_index when helpful).'
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
    handler: async ({ query: nlQuery, index = '*', fields }, { esClient, modelProvider, logger, events }) => {
      const fieldsHint =
        fields && fields.length > 0
          ? ` Requested output fields (KEEP): ${fields.map((f) => `\`${f}\``).join(', ')}.`
          : '';

      const enhancedQuery = `${nlQuery}

IMPORTANT: Return ONLY the fields required to answer the question. Avoid dumping full documents or large nested objects.
When generating ES|QL you MUST use a KEEP clause to restrict output to a small set of relevant fields (ideally <= 12).${fieldsHint}
Prefer returning a small sample (e.g. LIMIT 20–50) and include @timestamp when a time range is involved.`;

      logger.debug(`search tool called with query: ${nlQuery}, index: ${index}`);
      const results = await runSearchTool({
        nlQuery: enhancedQuery,
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
