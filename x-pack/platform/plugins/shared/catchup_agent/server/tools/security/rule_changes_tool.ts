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

const ruleChangesSchema = z.object({
  since: z.string().describe('ISO datetime string for the start time to track rule changes'),
});

export const ruleChangesTool = (): BuiltinToolDefinition<typeof ruleChangesSchema> => {
  return {
    id: 'platform.catchup.security.rule_changes',
    type: ToolType.builtin,
    description: `Tracks recently edited detection rules from Elastic Security since a given timestamp.
    
The 'since' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z').
Returns rules with name, updated_by, enabled status, and updated_at fields.`,
    schema: ruleChangesSchema,
    handler: async ({ since }, { request, logger }) => {
      try {
        logger.info(`[CatchUp Agent] Rule changes tool called with since: ${since}`);

        const sinceDate = new Date(since);
        if (isNaN(sinceDate.getTime())) {
          throw new Error(`Invalid datetime format: ${since}. Expected ISO 8601 format.`);
        }

        const { plugin, core } = getPluginServices();

        // Use Rules Client API to fetch detection rules updated since the given date
        if (!plugin.getRulesClient) {
          logger.warn('Alerting plugin not available, returning empty results');
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  rules: [],
                  total: 0,
                  since,
                  message: 'Alerting plugin not available',
                },
              },
            ],
          };
        }

        const rulesClient = await plugin.getRulesClient(request);

        // Find all detection rules (SIEM rules)
        // Detection rules have alertTypeId starting with 'siem.' and consumer 'siem'
        // We'll fetch rules and filter by updatedAt client-side
        const findResult = await rulesClient.find({
          options: {
            filter: 'alert.attributes.consumer: siem',
            sortField: 'updatedAt',
            sortOrder: 'desc',
            perPage: 100,
            page: 1,
          },
        });

        // Filter rules that were updated after the 'since' date
        const sinceTimestamp = sinceDate.getTime();
        const filteredRules = findResult.data.filter((rule) => {
          const updatedAt = new Date(rule.updatedAt ?? rule.updated_at ?? '').getTime();
          return updatedAt > sinceTimestamp;
        });

        // Format rules data
        const rulesData = filteredRules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          updated_by: rule.updatedBy || rule.updated_by || null,
          enabled: rule.enabled ?? false,
          updated_at: rule.updatedAt || rule.updated_at || null,
        }));

        return {
          results: [
            {
              type: ToolResultType.tabularData,
              data: {
                source: 'rules_api',
                columns: [
                  { name: 'id', type: 'keyword' },
                  { name: 'name', type: 'keyword' },
                  { name: 'updated_by', type: 'keyword' },
                  { name: 'enabled', type: 'boolean' },
                  { name: 'updated_at', type: 'date' },
                ],
                values: rulesData.map((r) => [r.id, r.name, r.updated_by, r.enabled, r.updated_at]),
              },
            },
            {
              type: ToolResultType.other,
              data: {
                total: rulesData.length,
                since,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`[CatchUp Agent] Error in rule changes tool: ${errorMessage}`);
        if (errorStack) {
          logger.debug(`[CatchUp Agent] Rule changes tool error stack: ${errorStack}`);
        }
        return {
          results: [createErrorResult(`Error fetching rule changes: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'rules'],
  };
};
