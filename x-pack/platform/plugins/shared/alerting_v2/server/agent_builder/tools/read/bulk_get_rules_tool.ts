/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import dedent from 'dedent';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { GetScopedRulesClient } from '../../scoped_rules_client_factory';
import { toToolError } from '../../tool_error';
import { ALERTING_V2_BULK_GET_RULES_TOOL_ID, ALERTING_V2_TOOL_TAGS } from '../../tool_ids';

const schema = z.object({
  ids: z.array(z.string()).min(1).max(1000).describe('Array of rule IDs to retrieve (max 1000).'),
});

export const createBulkGetRulesTool = ({
  getScopedRulesClient,
}: {
  getScopedRulesClient: GetScopedRulesClient;
}): BuiltinToolDefinition<typeof schema> => ({
  id: ALERTING_V2_BULK_GET_RULES_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Retrieves up to 1000 Alerting v2 rules by ID in a single request. More efficient than calling get_rule repeatedly when you already have a known set of IDs.

    **When to use:**
    - You have multiple rule IDs and need their full definitions
    - Prefer this over multiple get_rule calls
  `),
  tags: [...ALERTING_V2_TOOL_TAGS],
  schema,
  handler: async ({ ids }, { request }) => {
    try {
      const rulesClient = getScopedRulesClient(request);
      const rules = await rulesClient.getRules(ids);
      return { results: [{ type: ToolResultType.other, data: { rules } }] };
    } catch (err) {
      return toToolError(err);
    }
  },
});
