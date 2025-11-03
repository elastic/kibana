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

const attackDiscoverySchema = z.object({
  since: z.string().describe('ISO datetime string for the start time to fetch attack discoveries'),
});

export const attackDiscoveryTool = (): BuiltinToolDefinition<typeof attackDiscoverySchema> => {
  return {
    id: 'platform.catchup.security.attack_discoveries',
    type: ToolType.builtin,
    description: `Retrieves new or updated attack discoveries from Elastic Security since a given timestamp.
    
The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
Returns attack discoveries with metadata including attack name, severity, status, entities, and related cases.`,
    schema: attackDiscoverySchema,
    handler: async ({ since }, { request, esClient, logger }) => {
      try {
        logger.info(`[CatchUp Agent] Attack discovery tool called with since: ${since}`);

        // Query attack discoveries index using ES|QL
        // Validate datetime format first
        const sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          throw new Error(`Invalid datetime format: ${since}. Expected ISO 8601 format.`);
        }

        // Get space ID from request
        const spaceId = getSpaceId(request);

        // Use space-aware index pattern for attack discoveries
        // Format: .alerts-security.attack.discovery.alerts-${spaceId}*,.adhoc.alerts-security.attack.discovery.alerts-${spaceId}*
        const query = `FROM .alerts-security.attack.discovery.alerts-${spaceId}*,.adhoc.alerts-security.attack.discovery.alerts-${spaceId}*
| WHERE @timestamp > TO_DATETIME("${since}")
| KEEP metadata.attack_name, metadata.severity, metadata.status, metadata.entities.hosts, related_cases, @timestamp
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
            logger.debug(`Attack discovery indices not found, returning empty results`);
            result = {
              columns: [
                { name: 'metadata.attack_name', type: 'keyword' },
                { name: 'metadata.severity', type: 'keyword' },
                { name: 'metadata.status', type: 'keyword' },
                { name: 'metadata.entities.hosts', type: 'object' },
                { name: 'related_cases', type: 'keyword' },
                { name: '@timestamp', type: 'date' },
              ],
              values: [],
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
                total: result.values.length,
                since,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`Error in attack discovery tool: ${errorMessage}`);
        if (errorStack) {
          logger.debug(`Attack discovery tool error stack: ${errorStack}`);
        }
        return {
          results: [createErrorResult(`Error fetching attack discoveries: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'attack-discovery'],
  };
};
