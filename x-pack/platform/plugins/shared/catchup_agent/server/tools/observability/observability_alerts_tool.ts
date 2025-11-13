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
import { normalizeTimeRange } from '../utils/date_normalization';

const observabilityAlertsSchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch observability alerts (inclusive). If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to fetch observability alerts (exclusive). If not provided, defaults to now. If no year is specified (e.g., "11-02T00:00:00Z"), the current year is assumed. Use this to filter for a specific date range (e.g., for "November 2", use start="11-02T00:00:00Z" and end="11-03T00:00:00Z")'
    ),
});

export const observabilityAlertsTool = (): BuiltinToolDefinition<
  typeof observabilityAlertsSchema
> => {
  return {
    id: 'hackathon.catchup.observability.alerts',
    type: ToolType.builtin,
    description: `Queries observability alerts from Elastic Observability since a given timestamp. **Use this tool when the user asks specifically about observability alerts.** This tool provides aggregated statistics including open/resolved alerts and total alerts.

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
The optional 'end' parameter allows filtering to a specific date range. For example, to get alerts from November 2, use start="11-02T00:00:00Z" and end="11-03T00:00:00Z" (current year will be used).
Returns aggregated statistics including open/resolved alerts and total alerts.`,
    schema: observabilityAlertsSchema,
    handler: async ({ start, end }, { esClient, logger }) => {
      try {
        // Normalize and adjust time range using helper function
        const timeRange = normalizeTimeRange(start, end, { logger });

        // Build date range filter using normalized dates
        // If end is provided, use a range query; otherwise use a simple greater-than query
        let dateFilter: string;
        if (timeRange.endDate && timeRange.end) {
          dateFilter = `@timestamp >= TO_DATETIME("${timeRange.start}") AND @timestamp < TO_DATETIME("${timeRange.end}")`;
        } else {
          dateFilter = `@timestamp > TO_DATETIME("${timeRange.start}")`;
        }

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

        let result;
        try {
          result = await executeEsql({
            query,
            esClient: esClient.asCurrentUser,
          });
        } catch (esqlError: any) {
          logger.error(`[CatchUp Agent] ES|QL query failed: ${esqlError.message}`);
          // If indices don't exist, return empty results instead of failing
          if (
            esqlError.message?.includes('Unknown index') ||
            esqlError.message?.includes('no such index')
          ) {
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
                start: timeRange.start,
                end: timeRange.end,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in observability alerts tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error fetching observability alerts: ${errorMessage}`)],
        };
      }
    },
    tags: ['observability', 'alerts'],
  };
};
