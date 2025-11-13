/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import { createErrorResult } from '@kbn/onechat-server';
import { executeEsql } from '@kbn/onechat-genai-utils/tools/utils/esql';

const searchUpdatesSchema = z.object({
  start: z.string().describe('ISO datetime string for the start time to fetch search updates'),
});

export const searchUpdatesTool = (): BuiltinToolDefinition<typeof searchUpdatesSchema> => {
  return {
    id: 'hackathon.catchup.search.summary',
    type: ToolType.builtin,
    description: `Summarizes Search and indexing changes from Elasticsearch since a given timestamp.

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
Returns analytics data including CTR changes and top queries.`,
    schema: searchUpdatesSchema,
    handler: async ({ start }, { esClient, logger }) => {
      try {
        const startDate = new Date(start);
        if (isNaN(startDate.getTime())) {
          throw new Error(`Invalid datetime format: ${start}. Expected ISO 8601 format.`);
        }

        // Query search analytics using ES|QL
        // Use TO_DATETIME to convert ISO string to datetime for comparison
        // Handle case where index might not exist
        const query = `FROM .ent-search-analytics-*
| WHERE @timestamp > TO_DATETIME("${start}")
| STATS
    avg_ctr = AVG(click_through_rate),
    total_queries = COUNT(*)
| LIMIT 1`;

        let result;
        try {
          result = await executeEsql({
            query,
            esClient: esClient.asCurrentUser,
          });
        } catch (esqlError: any) {
          // If index doesn't exist, return empty results instead of failing
          if (
            esqlError.message?.includes('Unknown index') ||
            esqlError.message?.includes('no such index')
          ) {
            result = {
              columns: [
                { name: 'avg_ctr', type: 'double' },
                { name: 'total_queries', type: 'long' },
              ],
              values: [[null, 0]],
            };
          } else {
            throw esqlError;
          }
        }

        return {
          results: [
            {
              type: ToolResultType.tabularData,
              data: {
                source: 'esql',
                query,
                columns: result.columns,
                values: result.values,
              },
            },
            {
              type: ToolResultType.other,
              data: {
                start,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in search updates tool: ${errorMessage}`, {
          error: error instanceof Error ? error.stack : undefined,
        });
        return {
          results: [createErrorResult(`Error fetching search updates: ${errorMessage}`)],
        };
      }
    },
    tags: ['search', 'analytics'],
  };
};
