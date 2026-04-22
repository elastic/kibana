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
import { updateRuleDataSchema } from '@kbn/alerting-v2-schemas';
import type { GetScopedRulesClient } from '../../scoped_rules_client_factory';
import { toToolError } from '../../tool_error';
import { ALERTING_V2_UPDATE_RULE_TOOL_ID, ALERTING_V2_TOOL_TAGS } from '../../tool_ids';

const schema = z.object({
  rule_id: z.string().describe('The ID of the rule to update.'),
  data: updateRuleDataSchema,
});

export const createUpdateRuleTool = ({
  getScopedRulesClient,
}: {
  getScopedRulesClient: GetScopedRulesClient;
}): BuiltinToolDefinition<typeof schema> => ({
  id: ALERTING_V2_UPDATE_RULE_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Updates an existing Alerting v2 rule. Omitted fields are left unchanged — only send the fields you want to change.

    **If you do not have the rule ID:** use find_rules first.

    **Nullable fields — send null only to intentionally clear:**
    recovery_policy, grouping, no_data, and artifacts accept null to remove the value.
    Do not send null for these fields unless the user explicitly wants to clear them.

    **Enabling / disabling:**
    Prefer enable_rule / disable_rule over setting the enabled field here.
  `),
  tags: [...ALERTING_V2_TOOL_TAGS],
  schema,
  confirmation: { askUser: 'always' },
  handler: async ({ rule_id, data }, { request }) => {
    try {
      const rulesClient = getScopedRulesClient(request);
      const rule = await rulesClient.updateRule({ id: rule_id, data });
      return { results: [{ type: ToolResultType.other, data: rule }] };
    } catch (err) {
      return toToolError(err);
    }
  },
});
