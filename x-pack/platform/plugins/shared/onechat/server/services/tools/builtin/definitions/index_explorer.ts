/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { builtinToolIds, builtinTags } from '@kbn/onechat-common';
import { indexExplorer } from '@kbn/onechat-genai-utils';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

const indexExplorerSchema = z.object({
  query: z.string().describe('A natural language query to infer which indices to use.'),
  limit: z
    .number()
    .optional()
    .describe('(optional) Limit the max number of indices to return. Defaults to 1.'),
  indexPattern: z
    .string()
    .optional()
    .describe('(optional) Index pattern to filter indices by. Defaults to *.'),
});

export const indexExplorerTool = (): BuiltinToolDefinition<typeof indexExplorerSchema> => {
  return {
    id: builtinToolIds.indexExplorer,
    description: `List relevant indices and corresponding mappings based on a natural language query.

                  The 'indexPattern' parameter can be used to filter indices by a specific pattern, e.g. 'foo*'.
                  This should *only* be used if you know what you're doing (e.g. if the user explicitly specified a pattern).
                  Otherwise, leave it empty to list all indices.

                  *Example:*
                  User: "Show me my latest alerts"
                  You: call tool 'indexExplorer' with { query: 'indices containing alerts' }
                  Tool result: [{ indexName: '.alerts', mappings: {...} }]
                  `,
    schema: indexExplorerSchema,
    handler: async (
      { query: nlQuery, indexPattern = '*', limit = 1 },
      { esClient, modelProvider }
    ) => {
      const model = await modelProvider.getDefaultModel();
      const result = await indexExplorer({
        nlQuery,
        indexPattern,
        limit,
        esClient: esClient.asCurrentUser,
        model,
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              indices: result,
              nlQuery,
              index_pattern: indexPattern,
              limit,
            },
          },
        ],
      };
    },
    tags: [builtinTags.retrieval],
  };
};
