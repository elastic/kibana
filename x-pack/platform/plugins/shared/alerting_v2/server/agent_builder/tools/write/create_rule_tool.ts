/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createRuleDataSchema } from '@kbn/alerting-v2-schemas';
import type { GetScopedRulesClient } from '../../scoped_rules_client_factory';
import { toToolError } from '../../tool_error';
import { ALERTING_V2_CREATE_RULE_TOOL_ID, ALERTING_V2_TOOL_TAGS } from '../../tool_ids';

const schema = z.object({
  id: z.string().optional().describe('Optional ID for the new rule.'),
  data: createRuleDataSchema,
});

export const createCreateRuleTool = ({
  getScopedRulesClient,
}: {
  getScopedRulesClient: GetScopedRulesClient;
}): BuiltinToolDefinition<typeof schema> => ({
  id: ALERTING_V2_CREATE_RULE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Creates a new Alerting v2 rule. Requires an ES|QL query, a schedule, metadata (name, kind), and optionally notification policy references.',
  tags: [...ALERTING_V2_TOOL_TAGS],
  schema,
  confirmation: { askUser: 'always' },
  handler: async ({ id, data }, { request }) => {
    try {
      const rulesClient = getScopedRulesClient(request);
      const rule = await rulesClient.createRule({ data, options: id ? { id } : undefined });
      return { results: [{ type: ToolResultType.other, data: rule }] };
    } catch (err) {
      return toToolError(err);
    }
  },
});
