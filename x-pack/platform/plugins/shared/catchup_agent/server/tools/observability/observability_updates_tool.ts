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
import { normalizeDateToCurrentYear } from '../utils/date_normalization';

const observabilityUpdatesSchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch observability updates (inclusive). If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to fetch observability updates (exclusive). If not provided, defaults to now. If no year is specified (e.g., "11-02T00:00:00Z"), the current year is assumed. Use this to filter for a specific date range (e.g., for "November 2", use start="11-02T00:00:00Z" and end="11-03T00:00:00Z")'
    ),
});

export const observabilityUpdatesTool = (): BuiltinToolDefinition<
  typeof observabilityUpdatesSchema
> => {
  return {
    id: 'platform.catchup.observability.summary',
    type: ToolType.builtin,
    description: `Summarizes alerts and anomalies from Elastic Observability since a given timestamp. **Use this tool when the user asks about Observability, observability alerts, observability updates, or wants to catch up on Observability activity.** This tool provides aggregated statistics including open/resolved alerts and top services.
    
The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
The optional 'end' parameter allows filtering to a specific date range. For example, to get alerts from November 2, use start="11-02T00:00:00Z" and end="11-03T00:00:00Z" (current year will be used).
Returns aggregated statistics including open/resolved alerts and top services.`,
    schema: observabilityUpdatesSchema,
    handler: async ({ start, end }, { esClient, logger }) => {
      try {
        logger.info(
          `[CatchUp Agent] Observability updates tool called with start: ${start}, end: ${
            end || 'now'
          }`
        );

        // Normalize dates to current year if year is missing
        const normalizedStart = normalizeDateToCurrentYear(start);
        const startDate = new Date(normalizedStart);
        if (isNaN(startDate.getTime())) {
          throw new Error(`Invalid datetime format: ${start}. Expected ISO 8601 format.`);
        }

        let endDate: Date | null = null;
        let normalizedEnd: string | null = null;
        if (end) {
          normalizedEnd = normalizeDateToCurrentYear(end);
          endDate = new Date(normalizedEnd);
          if (isNaN(endDate.getTime())) {
            throw new Error(`Invalid datetime format: ${end}. Expected ISO 8601 format.`);
          }
        }

        // Build date range filter using normalized dates
        // If end is provided, use a range query; otherwise use a simple greater-than query
        let dateFilter: string;
        if (endDate && normalizedEnd) {
          dateFilter = `@timestamp >= TO_DATETIME("${normalizedStart}") AND @timestamp < TO_DATETIME("${normalizedEnd}")`;
        } else {
          dateFilter = `@timestamp > TO_DATETIME("${normalizedStart}")`;
        }

        logger.debug(
          `[CatchUp Agent] Normalized start: ${normalizedStart}, end: ${normalizedEnd || 'none'}`
        );
        logger.debug(`[CatchUp Agent] Date filter: ${dateFilter}`);

        // Query observability alerts using ES|QL
        // Match all observability alerts indices:
        // - .alerts-observability.* (APM, uptime, metrics, logs, SLO, threshold)
        // - .alerts-default.* (default alerts)
        // - .alerts-stack.* (stack alerts)
        // - .alerts-ml.* (ML anomaly detection alerts)
        // - .alerts-dataset.* (dataset quality alerts)
        // ES|QL uses single pipe | for line continuation (not || or |||)
        // Use TO_STRING() to handle type ambiguity (keyword vs text) for workflow_status
        // Use SUM(CASE(...)) for conditional counting since COUNT_IF doesn't exist in ES|QL
        const query = `FROM .alerts-observability.*,.alerts-default.*,.alerts-stack.*,.alerts-ml.*,.alerts-dataset.*
| WHERE ${dateFilter}
| EVAL workflow_status_str = TO_STRING(kibana.alert.workflow_status)
| STATS 
    open_alerts = SUM(CASE(workflow_status_str == "open", 1, 0)),
    resolved_alerts = SUM(CASE(workflow_status_str == "closed", 1, 0)),
    total_alerts = COUNT(*)
| LIMIT 1`;

        // eslint-disable-next-line no-console
        console.log('[CatchUp Agent] Observability tool - Normalized start:', normalizedStart);
        // eslint-disable-next-line no-console
        console.log(
          '[CatchUp Agent] Observability tool - Normalized end:',
          normalizedEnd || 'none'
        );
        // eslint-disable-next-line no-console
        console.log('[CatchUp Agent] Observability tool - Date filter:', dateFilter);
        // eslint-disable-next-line no-console
        console.log('[CatchUp Agent] Observability tool - Full ES|QL query:', query);
        logger.debug(`[CatchUp Agent] Executing ES|QL query: ${query}`);

        let result;
        try {
          // eslint-disable-next-line no-console
          console.log('[CatchUp Agent] Observability tool - About to execute ES|QL query');
          result = await executeEsql({
            query,
            esClient: esClient.asCurrentUser,
          });
          // eslint-disable-next-line no-console
          console.log('[CatchUp Agent] Observability tool - ES|QL query executed successfully');
          // eslint-disable-next-line no-console
          console.log('[CatchUp Agent] Observability tool - Result columns:', result.columns);
          // eslint-disable-next-line no-console
          console.log('[CatchUp Agent] Observability tool - Result values:', result.values);
          // eslint-disable-next-line no-console
          console.log('[CatchUp Agent] Observability tool - Rows returned:', result.values.length);
          logger.debug(
            `[CatchUp Agent] ES|QL query executed successfully. Rows returned: ${result.values.length}`
          );
        } catch (esqlError: any) {
          // eslint-disable-next-line no-console
          console.error(
            '[CatchUp Agent] Observability tool - ES|QL query failed:',
            esqlError.message
          );
          // eslint-disable-next-line no-console
          console.error('[CatchUp Agent] Observability tool - Failed query:', query);
          if (esqlError.stack) {
            // eslint-disable-next-line no-console
            console.error('[CatchUp Agent] Observability tool - Error stack:', esqlError.stack);
          }
          logger.error(`[CatchUp Agent] ES|QL query failed: ${esqlError.message}`);
          logger.debug(`[CatchUp Agent] ES|QL query that failed: ${query}`);
          if (esqlError.stack) {
            logger.debug(`[CatchUp Agent] ES|QL error stack: ${esqlError.stack}`);
          }
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
                start: normalizedStart,
                end: normalizedEnd || null,
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
