/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { GetScopedRulesClient } from '../../scoped_rules_client_factory';
import { toToolError } from '../../tool_error';
import { ALERTING_V2_DELETE_RULE_TOOL_ID, ALERTING_V2_TOOL_TAGS } from '../../tool_ids';

const schema = z.object({
  rule_id: z.string().describe('The ID of the rule to permanently delete.'),
});

export const createDeleteRuleTool = ({
  getScopedRulesClient,
}: {
  getScopedRulesClient: GetScopedRulesClient;
}): BuiltinToolDefinition<typeof schema> => ({
  id: ALERTING_V2_DELETE_RULE_TOOL_ID,
  type: ToolType.builtin,
  description: 'Permanently deletes an Alerting v2 rule. This action cannot be undone.',
  tags: [...ALERTING_V2_TOOL_TAGS],
  schema,
  confirmation: { askUser: 'always' },
  handler: async ({ rule_id }, { request }) => {
    try {
      const rulesClient = getScopedRulesClient(request);
      await rulesClient.deleteRule({ id: rule_id });
      return {
        results: [{ type: ToolResultType.other, data: { success: true, rule_id } }],
      };
    } catch (err) {
      return toToolError(err);
    }
  },
});
