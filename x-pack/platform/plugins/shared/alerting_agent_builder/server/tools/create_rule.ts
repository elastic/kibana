/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup } from '@kbn/core/server';
import type { PluginStartDependencies } from '../types';

export const ALERTING_CREATE_RULE_TOOL_ID = 'alerting.create_rule';

const createRuleSchema = z.object({
  name: z.string().describe('The display name for the rule'),
  rule_type_id: z.string().describe('The rule type ID obtained from list_rule_types'),
  consumer: z
    .string()
    .describe(
      'The consumer/application for the rule. Common values: "alerts", "stackAlerts", "logs", "metrics", "uptime", "apm", "siem". Use the producer field from list_rule_types as a hint.'
    ),
  schedule_interval: z
    .string()
    .describe('How often the rule should run. Examples: "5m", "1h", "30s", "1d"'),
  params: z
    .string()
    .describe(
      'JSON string of type-specific rule parameters. Collect each required field from the user based on get_rule_type_params_schema, then serialize as JSON.'
    ),
  tags: z.string().optional().describe('Optional comma-separated list of tags for the rule'),
});

export function createCreateRuleTool(
  core: CoreSetup<PluginStartDependencies>
): StaticToolRegistration<typeof createRuleSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof createRuleSchema> = {
    id: ALERTING_CREATE_RULE_TOOL_ID,
    type: ToolType.builtin,
    description: `Create an alerting rule in Kibana. Follow this workflow:
1. Call list_rule_types to discover available rule types and show the user their options
2. Ask the user which rule type they want to use
3. Call get_rule_type_params_schema with the chosen rule_type_id to learn the required parameters
4. Ask the user for each required parameter one at a time
5. Call this tool with all the collected information`,
    schema: createRuleSchema,
    tags: ['alerting', 'rules'],
    handler: async (
      { name, rule_type_id, consumer, schedule_interval, params: paramsStr, tags },
      { request }
    ) => {
      let params: Record<string, unknown>;
      try {
        params = JSON.parse(paramsStr);
      } catch {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: 'Invalid JSON in params field. Please provide valid JSON.' },
            },
          ],
        };
      }

      const tagList = tags
        ? tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      try {
        const [, { alerting }] = await core.getStartServices();
        const rulesClient = await alerting.getRulesClientWithRequest(request);
        const rule = await rulesClient.create({
          data: {
            name,
            alertTypeId: rule_type_id,
            enabled: true,
            consumer,
            tags: tagList,
            schedule: { interval: schedule_interval },
            params,
            actions: [],
            systemActions: [],
          },
        });

        return {
          results: [{ type: ToolResultType.other, data: { rule } }],
        };
      } catch (error) {
        return {
          results: [{ type: ToolResultType.error, data: { message: error.message } }],
        };
      }
    },
  };

  return toolDefinition;
}
