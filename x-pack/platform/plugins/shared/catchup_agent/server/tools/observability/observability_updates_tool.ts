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

const observabilityUpdatesSchema = z.object({
  since: z
    .string()
    .describe('ISO datetime string for the start time to fetch observability updates'),
});

export const observabilityUpdatesTool = (): BuiltinToolDefinition<
  typeof observabilityUpdatesSchema
> => {
  return {
    id: 'platform.catchup.observability.summary',
    type: ToolType.builtin,
    description: `Summarizes alerts and anomalies from Elastic Observability since a given timestamp.
    
The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
Returns aggregated statistics including open/resolved alerts and top services.`,
    schema: observabilityUpdatesSchema,
    handler: async ({ since }, { esClient, logger }) => {
      try {
        logger.info(`[CatchUp Agent] Observability updates tool called with since: ${since}`);

        const sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          throw new Error(`Invalid datetime format: ${since}. Expected ISO 8601 format.`);
        }

        // Query observability alerts using ES|QL
        // Use TO_DATETIME to convert ISO string to datetime for comparison
        // Use .internal.alerts-observability.* for new alerts-as-data format
        const query = `FROM .internal.alerts-observability.*,.alerts-observability*
| WHERE @timestamp > TO_DATETIME("${since}")
| STATS 
    open_alerts = COUNT_IF(kibana.alert.workflow_status == "open" OR status == "open"),
    resolved_alerts = COUNT_IF(kibana.alert.workflow_status == "closed" OR status == "closed"),
    total_alerts = COUNT(*)
| LIMIT 1`;

        let result;
        try {
          result = await executeEsql({
            query,
            esClient: esClient.asCurrentUser,
          });
        } catch (esqlError: any) {
          // If indices don't exist, return empty results instead of failing
          if (
            esqlError.message?.includes('Unknown index') ||
            esqlError.message?.includes('no such index')
          ) {
            logger.debug(`Observability alerts indices not found, returning empty results`);
            result = {
              columns: [
                { name: 'open_alerts', type: 'long' },
                { name: 'resolved_alerts', type: 'long' },
                { name: 'total_alerts', type: 'long' },
              ],
              values: [[0, 0, 0]],
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
                since,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`Error in observability updates tool: ${errorMessage}`);
        if (errorStack) {
          logger.debug(`Observability updates tool error stack: ${errorStack}`);
        }
        return {
          results: [createErrorResult(`Error fetching observability updates: ${errorMessage}`)],
        };
      }
    },
    tags: ['observability', 'alerts'],
  };
};
