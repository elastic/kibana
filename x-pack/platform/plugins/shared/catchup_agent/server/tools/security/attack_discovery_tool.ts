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
import { getSpaceId, getPluginServices } from '../../services/service_locator';
import { normalizeTimeRange } from '../utils/date_normalization';
import { getAttackDiscoveryUrl } from '../utils/kibana_urls';

const attackDiscoverySchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to fetch attack discoveries (inclusive). If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to fetch attack discoveries (exclusive). If not provided, defaults to now. If no year is specified (e.g., "11-02T00:00:00Z"), the current year is assumed. Use this to filter for a specific date range (e.g., for "November 2", use start="11-02T00:00:00Z" and end="11-03T00:00:00Z")'
    ),
});

export const attackDiscoveryTool = (): BuiltinToolDefinition<typeof attackDiscoverySchema> => {
  return {
    id: 'hackathon.catchup.security.attack_discoveries',
    type: ToolType.builtin,
    description: `Retrieves attack discoveries from Elastic Security. **Use this tool when the user asks specifically about "attack discoveries", "attack discovery", "AI-generated security insights", or "how many attack discoveries"**. This tool is specialized for attack discovery queries and should be preferred over the general security summary tool when the user's question is specifically about attack discoveries.

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
The optional 'end' parameter allows filtering to a specific date range. For example, to get discoveries created on November 2, use start="11-02T00:00:00Z" and end="11-03T00:00:00Z" (current year will be used).
Returns attack discoveries with metadata including attack name, severity, status, alert IDs, and related cases.`,
    schema: attackDiscoverySchema,
    handler: async ({ start, end }, { request, esClient, logger }) => {
      try {
        // Normalize and adjust time range using helper function
        const timeRange = normalizeTimeRange(start, end, { logger });

        // Get space ID from request
        const spaceId = getSpaceId(request);

        // Build date range filter using normalized dates
        // If end is provided, use a range query; otherwise use a simple greater-than query
        let dateFilter: string;
        if (timeRange.endDate && timeRange.end) {
          dateFilter = `@timestamp >= TO_DATETIME("${timeRange.start}") AND @timestamp < TO_DATETIME("${timeRange.end}")`;
        } else {
          dateFilter = `@timestamp > TO_DATETIME("${timeRange.start}")`;
        }

        // Use space-aware index pattern for attack discoveries
        // Include _id for generating URLs using METADATA directive
        // For catchup purposes, show all attack discoveries created in the time range
        // The workflow_status is included in the results so users can see which are open
        const query = `FROM .alerts-security.attack.discovery.alerts-${spaceId}*,.adhoc.alerts-security.attack.discovery.alerts-${spaceId}* METADATA _id
| WHERE ${dateFilter}
| KEEP _id, kibana.alert.attack_discovery.title, kibana.alert.severity, kibana.alert.workflow_status, kibana.alert.attack_discovery.alert_ids, kibana.alert.case_ids, @timestamp
| SORT @timestamp DESC
| LIMIT 100`;

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
            result = {
              columns: [
                { name: '_id', type: 'keyword' },
                { name: 'kibana.alert.attack_discovery.title', type: 'text' },
                { name: 'kibana.alert.severity', type: 'keyword' },
                { name: 'kibana.alert.workflow_status', type: 'keyword' },
                { name: 'kibana.alert.attack_discovery.alert_ids', type: 'keyword' },
                { name: 'kibana.alert.case_ids', type: 'keyword' },
                { name: '@timestamp', type: 'date' },
              ],
              values: [],
            };
          } else {
            throw esqlError;
          }
        }

        // Get core services for generating URLs
        const { core } = getPluginServices();

        // Find _id column index
        const idColumnIndex = result.columns.findIndex((col) => col.name === '_id');
        const titleColumnIndex = result.columns.findIndex(
          (col) => col.name === 'kibana.alert.attack_discovery.title'
        );

        // Generate URLs for each attack discovery
        const attackDiscoveries = result.values.map((row) => {
          const id = idColumnIndex >= 0 ? (row[idColumnIndex] as string) : null;
          const url = id ? getAttackDiscoveryUrl(request, core, id) : null;
          return {
            id,
            title: titleColumnIndex >= 0 ? (row[titleColumnIndex] as string) : null,
            url,
          };
        });

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
                total: result.values.length,
                start: timeRange.start,
                end: timeRange.end,
                attack_discoveries: attackDiscoveries,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Error in attack discovery tool: ${errorMessage}`, {
          error: error instanceof Error ? error.stack : undefined,
        });
        return {
          results: [createErrorResult(`Error fetching attack discoveries: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'attack-discovery'],
  };
};
