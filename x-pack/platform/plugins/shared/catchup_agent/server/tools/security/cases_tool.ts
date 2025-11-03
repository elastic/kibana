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
import { getPluginServices } from '../../services/service_locator';

const casesSchema = z.object({
  since: z.string().describe('ISO datetime string for the start time to fetch cases'),
});

export const casesTool = (): BuiltinToolDefinition<typeof casesSchema> => {
  return {
    id: 'platform.catchup.security.cases',
    type: ToolType.builtin,
    description: `Retrieves recently updated cases from Elastic Security since a given timestamp.
    
The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
Returns cases with id, title, status, owner, updated_by, and updated_at fields.`,
    schema: casesSchema,
    handler: async ({ since }, { request, logger }) => {
      try {
        logger.info(`[CatchUp Agent] Cases tool called with since: ${since}`);

        const sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          throw new Error(`Invalid datetime format: ${since}. Expected ISO 8601 format.`);
        }

        const { plugin, core } = getPluginServices();

        // Use Cases API to fetch cases updated since the given date
        if (!plugin.getCasesClient) {
          logger.warn('Cases plugin not available, returning empty results');
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  cases: [],
                  total: 0,
                  since,
                  message: 'Cases plugin not available',
                },
              },
            ],
          };
        }

        const casesClient = await plugin.getCasesClient(request);

        // Search for cases updated after the 'since' date
        // Cases API uses 'from' for created date, but we need updated date
        // We'll fetch cases and filter by updatedAt client-side, or use sortField
        const searchResult = await casesClient.cases.search({
          sortField: 'updatedAt',
          sortOrder: 'desc',
          perPage: 50,
          page: 1,
        });

        // Filter cases that were updated after the 'since' date
        const sinceTimestamp = sinceDate.getTime();
        const filteredCases = searchResult.cases.filter((caseItem) => {
          const updatedAt = new Date(caseItem.updatedAt ?? caseItem.updated_at ?? '').getTime();
          return updatedAt > sinceTimestamp;
        });

        // Format cases data
        const casesData = filteredCases.map((caseItem) => ({
          id: caseItem.id,
          title: caseItem.title,
          status: caseItem.status,
          owner: caseItem.owner,
          updated_by: caseItem.updatedBy?.username || caseItem.updated_by || null,
          updated_at: caseItem.updatedAt || caseItem.updated_at || null,
        }));

        return {
          results: [
            {
              type: ToolResultType.tabularData,
              data: {
                source: 'cases_api',
                columns: [
                  { name: 'id', type: 'keyword' },
                  { name: 'title', type: 'keyword' },
                  { name: 'status', type: 'keyword' },
                  { name: 'owner', type: 'keyword' },
                  { name: 'updated_by', type: 'keyword' },
                  { name: 'updated_at', type: 'date' },
                ],
                values: casesData.map((c) => [
                  c.id,
                  c.title,
                  c.status,
                  c.owner,
                  c.updated_by,
                  c.updated_at,
                ]),
              },
            },
            {
              type: ToolResultType.other,
              data: {
                total: casesData.length,
                since,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`[CatchUp Agent] Error in cases tool: ${errorMessage}`);
        if (errorStack) {
          logger.debug(`[CatchUp Agent] Cases tool error stack: ${errorStack}`);
        }
        return {
          results: [createErrorResult(`Error fetching cases: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'cases'],
  };
};
