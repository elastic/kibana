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
import { ALERTING_V2_BULK_DELETE_RULES_TOOL_ID, ALERTING_V2_TOOL_TAGS } from '../../tool_ids';

const schema = z
  .object({
    ids: z
      .array(z.string())
      .min(1)
      .max(100)
      .optional()
      .describe('Array of rule IDs to delete (max 100). Provide either ids or filter, not both.'),
    filter: z
      .string()
      .optional()
      .describe('KQL filter to select rules for deletion. Provide either filter or ids, not both.'),
  })
  .refine((v) => (v.ids != null) !== (v.filter != null), {
    message: 'Provide exactly one of ids or filter.',
  });

export const createBulkDeleteRulesTool = ({
  getScopedRulesClient,
}: {
  getScopedRulesClient: GetScopedRulesClient;
}): BuiltinToolDefinition<typeof schema> => ({
  id: ALERTING_V2_BULK_DELETE_RULES_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Permanently deletes multiple Alerting v2 rules. Accepts up to 100 IDs or a KQL filter. This action cannot be undone.',
  tags: [...ALERTING_V2_TOOL_TAGS],
  schema,
  confirmation: { askUser: 'always' },
  handler: async ({ ids, filter }, { request }) => {
    try {
      const rulesClient = getScopedRulesClient(request);
      const params = ids != null ? { ids } : { filter: filter! };
      const result = await rulesClient.bulkDeleteRules(params);
      return { results: [{ type: ToolResultType.other, data: result }] };
    } catch (err) {
      return toToolError(err);
    }
  },
});
