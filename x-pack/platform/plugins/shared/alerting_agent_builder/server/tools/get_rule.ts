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

export const ALERTING_GET_RULE_TOOL_ID = 'alerting.get_rule';

const getRuleSchema = z.object({
  id: z.string().describe('The ID of the rule to retrieve'),
});

export function createGetRuleTool(
  core: CoreSetup<PluginStartDependencies>
): StaticToolRegistration<typeof getRuleSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getRuleSchema> = {
    id: ALERTING_GET_RULE_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Retrieve a specific alerting rule by its ID. Use this to confirm a rule was created successfully or to inspect its current configuration.',
    schema: getRuleSchema,
    tags: ['alerting', 'rules'],
    handler: async ({ id }, { request }) => {
      try {
        const [, { alerting }] = await core.getStartServices();
        const rulesClient = await alerting.getRulesClientWithRequest(request);
        const rule = await rulesClient.get({ id });

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
