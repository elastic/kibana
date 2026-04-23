/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { ScopedRulesClientFactory } from './update_rule_tool';

export const ALERTING_V2_DELETE_RULES_TOOL_ID = `${internalNamespaces.alerting}.delete_rules`;

const deleteRulesToolSchema = z.object({
  rule_ids: z
    .array(z.string())
    .min(1)
    .max(100)
    .describe('Array of v2 alerting rule IDs to delete.'),
});

export const createDeleteRulesTool = (
  getRulesClient: ScopedRulesClientFactory,
  logger: Logger
): StaticToolRegistration<typeof deleteRulesToolSchema> => {
  const toolDefinition: BuiltinToolDefinition<typeof deleteRulesToolSchema> = {
    id: ALERTING_V2_DELETE_RULES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Deletes one or more v2 alerting rules by their IDs. ' +
      'Use this after applying a deduplication fix to remove duplicate rules, ' +
      'or to delete a stale rule that is no longer needed. ' +
      'Returns the count of successfully deleted rules and any errors.',
    schema: deleteRulesToolSchema,
    tags: ['alerting', 'rules', 'v2'],
    confirmation: { askUser: 'always' },
    handler: async ({ rule_ids: ruleIds }, { request }) => {
      try {
        logger.debug(`Delete v2 rules tool invoked for ${ruleIds.length} rule(s)`);

        const rulesClient = getRulesClient(request);
        const result = await rulesClient.bulkDeleteRules({ ids: ruleIds });

        const deletedCount = ruleIds.length - result.errors.length;
        logger.debug(`Successfully deleted ${deletedCount}/${ruleIds.length} rule(s)`);

        if (result.errors.length > 0) {
          return {
            results: [
              {
                type: ToolResultType.other,
                data: {
                  success: true,
                  deletedCount,
                  totalRequested: ruleIds.length,
                  errors: result.errors.map((e) => ({
                    id: e.id,
                    message: e.error.message,
                  })),
                },
              },
            ],
          };
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { success: true, deletedCount },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Delete v2 rules tool failed: ${message}`);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to delete rules: ${message}` },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
};
