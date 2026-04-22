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
import { ALERTING_V2_BULK_ENABLE_RULES_TOOL_ID, ALERTING_V2_TOOL_TAGS } from '../../tool_ids';

const schema = z
  .object({
    ids: z
      .array(z.string())
      .min(1)
      .optional()
      .describe('Array of rule IDs to enable. Provide either ids or filter, not both.'),
    filter: z
      .string()
      .optional()
      .describe('KQL filter to select rules for enabling. Provide either filter or ids, not both.'),
  })
  .refine((v) => (v.ids != null) !== (v.filter != null), {
    message: 'Provide exactly one of ids or filter.',
  });

export const createBulkEnableRulesTool = ({
  getScopedRulesClient,
}: {
  getScopedRulesClient: GetScopedRulesClient;
}): BuiltinToolDefinition<typeof schema> => ({
  id: ALERTING_V2_BULK_ENABLE_RULES_TOOL_ID,
  type: ToolType.builtin,
  description: 'Enables multiple Alerting v2 rules in a single request. Accepts a list of IDs or a KQL filter.',
  tags: [...ALERTING_V2_TOOL_TAGS],
  schema,
  confirmation: { askUser: 'always' },
  handler: async ({ ids, filter }, { request }) => {
    try {
      const rulesClient = getScopedRulesClient(request);
      const params = ids != null ? { ids } : { filter: filter! };
      const result = await rulesClient.bulkEnableRules(params);
      return { results: [{ type: ToolResultType.other, data: result }] };
    } catch (err) {
      return toToolError(err);
    }
  },
});
