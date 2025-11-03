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
import { getSpaceId } from '../../services/service_locator';

const detectionsSummarySchema = z.object({
  since: z.string().describe('ISO datetime string for the start time to summarize detections'),
});

export const detectionsSummaryTool = (): BuiltinToolDefinition<typeof detectionsSummarySchema> => {
  return {
    id: 'platform.catchup.security.detections',
    type: ToolType.builtin,
    description: `Summarizes detection alerts from Elastic Security since a given timestamp.
    
The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
Returns aggregated statistics including total count, counts by severity, and top rules.`,
    schema: detectionsSummarySchema,
    handler: async ({ since }, { request, esClient, logger }) => {
      try {
        logger.info(`[CatchUp Agent] Detections summary tool called with since: ${since}`);

        const sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          throw new Error(`Invalid datetime format: ${since}. Expected ISO 8601 format.`);
        }

        // Get space ID from request
        const spaceId = getSpaceId(request);

        // Query detections using ES|QL with aggregations
        // Use TO_DATETIME to convert ISO string to datetime for comparison
        // Use space-aware index pattern: .alerts-security.alerts-${spaceId}*
        // Also include legacy .siem-signals-* for backwards compatibility
        const query = `FROM .alerts-security.alerts-${spaceId}*,.siem-signals-*
| WHERE @timestamp > TO_DATETIME("${since}")
| STATS 
    total = COUNT(*),
    critical = COUNT_IF(kibana.alert.severity == "critical" OR signal.severity == "critical"),
    high = COUNT_IF(kibana.alert.severity == "high" OR signal.severity == "high"),
    medium = COUNT_IF(kibana.alert.severity == "medium" OR signal.severity == "medium"),
    low = COUNT_IF(kibana.alert.severity == "low" OR signal.severity == "low")
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
            logger.debug(`Security alerts indices not found, returning empty results`);
            result = {
              columns: [
                { name: 'total', type: 'long' },
                { name: 'critical', type: 'long' },
                { name: 'high', type: 'long' },
                { name: 'medium', type: 'long' },
                { name: 'low', type: 'long' },
              ],
              values: [[0, 0, 0, 0, 0]],
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
        logger.error(`Error in detections summary tool: ${errorMessage}`);
        if (errorStack) {
          logger.debug(`Detections summary tool error stack: ${errorStack}`);
        }
        return {
          results: [createErrorResult(`Error summarizing detections: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'detections'],
  };
};
