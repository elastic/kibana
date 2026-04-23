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
import { createRuleDataSchema } from '@kbn/alerting-v2-schemas';
import type { ScopedRulesClientFactory } from './update_rule_tool';

export const ALERTING_V2_CREATE_RULE_TOOL_ID = `${internalNamespaces.alerting}.create_rule`;

const createRuleToolSchema = z.object({
  rule: createRuleDataSchema.describe(
    'Full rule configuration. Required fields: kind ("alert" or "detect"), metadata (name), ' +
      'schedule (every, lookback), evaluation (query.base as ES|QL), and state_transition ' +
      '(for alert kind). Optional: grouping, recovery_policy, tags, description, no_data, artifacts.'
  ),
});

export const createCreateRuleTool = (
  getRulesClient: ScopedRulesClientFactory,
  logger: Logger
): StaticToolRegistration<typeof createRuleToolSchema> => {
  const toolDefinition: BuiltinToolDefinition<typeof createRuleToolSchema> = {
    id: ALERTING_V2_CREATE_RULE_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Creates a new v2 alerting rule. Use this to fill a coverage gap identified by Rule Doctor. ' +
      'Accepts a full rule configuration including kind, metadata, schedule, ES|QL evaluation query, ' +
      'grouping, state transition thresholds, and recovery policy. ' +
      'Returns the full created rule configuration on success.',
    schema: createRuleToolSchema,
    tags: ['alerting', 'rules', 'v2'],
    confirmation: { askUser: 'always' },
    handler: async ({ rule }, { request }) => {
      try {
        logger.debug(`Create v2 rule tool invoked for rule: ${rule.metadata.name}`);

        const rulesClient = getRulesClient(request);
        const created = await rulesClient.createRule({ data: rule });

        logger.debug(`Successfully created rule ${created.id}`);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { success: true, rule: created },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Create v2 rule tool failed: ${message}`);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to create rule: ${message}` },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
};
