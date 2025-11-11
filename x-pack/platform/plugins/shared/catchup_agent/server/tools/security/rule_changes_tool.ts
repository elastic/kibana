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
import { normalizeDateToCurrentYear } from '../utils/date_normalization';
import { getRuleUrl } from '../utils/kibana_urls';

const ruleChangesSchema = z.object({
  start: z
    .string()
    .describe(
      'ISO datetime string for the start time to track rule changes (inclusive). If no year is specified (e.g., "10-31T00:00:00Z"), the current year is assumed.'
    ),
  end: z
    .string()
    .optional()
    .describe(
      'ISO datetime string for the end time to track rule changes (exclusive). If not provided, defaults to now. If no year is specified (e.g., "11-02T00:00:00Z"), the current year is assumed. Use this to filter for a specific date range (e.g., for "November 2", use start="11-02T00:00:00Z" and end="11-03T00:00:00Z")'
    ),
});

export const ruleChangesTool = (): BuiltinToolDefinition<typeof ruleChangesSchema> => {
  return {
    id: 'hackathon.catchup.security.rule_changes',
    type: ToolType.builtin,
    description: `Tracks recently edited detection rules from Elastic Security since a given timestamp.

The 'start' parameter should be an ISO datetime string (e.g., '2025-01-15T00:00:00Z' or '01-15T00:00:00Z'). If no year is specified, the current year is assumed.
The optional 'end' parameter allows filtering to a specific date range. For example, to get rules updated on November 2, use start="11-02T00:00:00Z" and end="11-03T00:00:00Z" (current year will be used).
Returns rules with name, updated_by, enabled status, and updated_at fields.`,
    schema: ruleChangesSchema,
    handler: async ({ start, end }, { request, logger }) => {
      try {

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

        // Filter rules that were updated within the date range
        const startTimestamp = startDate.getTime();
        const endTimestamp = endDate ? endDate.getTime() : null;
        const filteredRules = findResult.data.filter((rule) => {
          const updatedAt = new Date(rule.updatedAt ?? rule.updated_at ?? '').getTime();
          const afterStart = updatedAt >= startTimestamp;
          const beforeEnd = endTimestamp === null || updatedAt < endTimestamp;
          return afterStart && beforeEnd;
        });

        // Format rules data with URLs
        const rulesData = filteredRules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          updated_by: rule.updatedBy || rule.updated_by || null,
          enabled: rule.enabled ?? false,
          updated_at: rule.updatedAt || rule.updated_at || null,
          url: getRuleUrl(request, core, rule.id),
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
                start: normalizedStart,
                end: normalizedEnd || null,
                rules: rulesData,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error(`[CatchUp Agent] Error in rule changes tool: ${errorMessage}`);
        return {
          results: [createErrorResult(`Error fetching rule changes: ${errorMessage}`)],
        };
      }
    },
    tags: ['security', 'rules'],
  };
};
