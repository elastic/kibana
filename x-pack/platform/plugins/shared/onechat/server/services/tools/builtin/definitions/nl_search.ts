/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { builtinToolIds, builtinTags } from '@kbn/onechat-common';
import { naturalLanguageSearch } from '@kbn/onechat-genai-utils';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';

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

export const naturalLanguageSearchTool = (): BuiltinToolDefinition<typeof searchDslSchema> => {
  return {
    id: builtinToolIds.naturalLanguageSearch,
    description: `
      Analyzes natural language questions to automatically find relevant indices, generate appropriate ES|QL queries, and execute them to answer analytical questions. This tool handles the complete workflow from question to answer, including index discovery, query generation, and execution. 
      Ideal for:
      - Statistical analysis and aggregations (counts, sums, averages, percentiles)
      - Time-based analysis and trending (changes over time, comparisons between periods)
      - Filtering and grouping data by specific criteria
      - Calculating metrics and KPIs from structured data
      - Finding patterns, anomalies, or outliers in datasets
      - Comparing values across different dimensions or categories
      The tool automatically determines the most appropriate index to query based on the question context, constructs optimized ES|QL queries for the analytical task, and returns processed results ready for interpretation.
      `,
    schema: searchDslSchema,
    handler: async ({ query: nlQuery, index, context }, { esClient, modelProvider }) => {
      const model = await modelProvider.getDefaultModel();
      const result = await naturalLanguageSearch({
        nlQuery,
        context,
        index,
        model,
        esClient: esClient.asCurrentUser,
      });

      return {
        results: [
          {
            type: ToolResultType.tabularData,
            data: result,
          },
        ],
      };
    },
    tags: [builtinTags.retrieval],
  };
};
