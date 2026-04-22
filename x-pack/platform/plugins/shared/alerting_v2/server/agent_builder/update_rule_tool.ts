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
import type { Logger, KibanaRequest } from '@kbn/core/server';
import { updateRuleDataSchema } from '@kbn/alerting-v2-schemas';
import type { RulesClient } from '../lib/rules_client/rules_client';

export const ALERTING_V2_UPDATE_RULE_TOOL_ID = `${internalNamespaces.alerting}.update_rule`;

const updateRuleToolSchema = z.object({
  rule_id: z.string().describe('The unique identifier of the v2 alerting rule to update.'),
  updates: updateRuleDataSchema.describe(
    'Partial rule update payload. Updatable fields include: metadata (name, description, tags, owner), schedule (every, lookback), evaluation (query.base as ES|QL), grouping (fields), recovery_policy, state_transition, enabled, and no_data.'
  ),
});

export type ScopedRulesClientFactory = (request: KibanaRequest) => RulesClient;

export const createUpdateRuleTool = (
  getRulesClient: ScopedRulesClientFactory,
  logger: Logger
): StaticToolRegistration<typeof updateRuleToolSchema> => {
  const toolDefinition: BuiltinToolDefinition<typeof updateRuleToolSchema> = {
    id: ALERTING_V2_UPDATE_RULE_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Updates an existing v2 alerting rule. Accepts a rule ID and a partial update payload ' +
      'with fields such as metadata (name, tags, description), schedule, ES|QL evaluation query, ' +
      'grouping, enabled status, state transition thresholds, and recovery policy. ' +
      'Returns the full updated rule configuration on success.',
    schema: updateRuleToolSchema,
    tags: ['alerting', 'rules', 'v2'],
    confirmation: { askUser: 'always' },
    handler: async ({ rule_id: ruleId, updates }, { request }) => {
      try {
        logger.debug(`Update v2 rule tool invoked for rule: ${ruleId}`);

        const rulesClient = getRulesClient(request);
        const updated = await rulesClient.updateRule({ id: ruleId, data: updates });

        logger.debug(`Successfully updated rule ${ruleId}`);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { success: true, rule: updated },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Update v2 rule tool failed for rule ${ruleId}: ${message}`);

        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to update rule: ${message}` },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
};
