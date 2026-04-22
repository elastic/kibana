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
import { ALERTING_V2_GET_RULE_TAGS_TOOL_ID, ALERTING_V2_TOOL_TAGS } from '../../tool_ids';

const schema = z.object({});

export const createGetRuleTagsTool = ({
  getScopedRulesClient,
}: {
  getScopedRulesClient: GetScopedRulesClient;
}): BuiltinToolDefinition<typeof schema> => ({
  id: ALERTING_V2_GET_RULE_TAGS_TOOL_ID,
  type: ToolType.builtin,
  description: 'Returns all unique tags used across Alerting v2 rules in the current space.',
  tags: [...ALERTING_V2_TOOL_TAGS],
  schema,
  handler: async (_params, { request }) => {
    try {
      const rulesClient = getScopedRulesClient(request);
      const tags = await rulesClient.getTags();
      return { results: [{ type: ToolResultType.other, data: { tags } }] };
    } catch (err) {
      return toToolError(err);
    }
  },
});
