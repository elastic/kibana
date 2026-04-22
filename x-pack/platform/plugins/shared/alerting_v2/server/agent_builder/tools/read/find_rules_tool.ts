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
import { findRulesSortFieldSchema } from '@kbn/alerting-v2-schemas';
import type { GetScopedRulesClient } from '../../scoped_rules_client_factory';
import { toToolError } from '../../tool_error';
import { ALERTING_V2_FIND_RULES_TOOL_ID, ALERTING_V2_TOOL_TAGS } from '../../tool_ids';

const schema = z.object({
  page: z.number().int().min(1).optional().describe('Page number (1-indexed).'),
  per_page: z.number().int().min(1).max(1000).optional().describe('Results per page.'),
  filter: z.string().optional().describe('KQL filter string.'),
  search: z.string().optional().describe('Free-text search across rule fields.'),
  sort_field: findRulesSortFieldSchema.optional().describe('Field to sort by.'),
  sort_order: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
});

export const createFindRulesTool = ({
  getScopedRulesClient,
}: {
  getScopedRulesClient: GetScopedRulesClient;
}): BuiltinToolDefinition<typeof schema> => ({
  id: ALERTING_V2_FIND_RULES_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Lists Alerting v2 rules with optional KQL filtering, free-text search, and pagination. Returns rule summaries including ID, name, kind, enabled state, and schedule.

    **When to use:**
    - User asks to list, search, or filter rules
    - You need to discover rule IDs before calling get_rule, update_rule, or delete_rule

    **Pagination:** Defaults to page 1. Use per_page + page to paginate large result sets.
    **Filtering:** filter accepts KQL (e.g. "name: nginx*"). search is a free-text match across fields.
  `),
  tags: [...ALERTING_V2_TOOL_TAGS],
  schema,
  handler: async (
    { page, per_page: perPage, filter, search, sort_field, sort_order },
    { request }
  ) => {
    try {
      const rulesClient = getScopedRulesClient(request);
      const result = await rulesClient.findRules({
        page,
        perPage,
        filter,
        search,
        sortField: sort_field,
        sortOrder: sort_order,
      });
      return { results: [{ type: ToolResultType.other, data: result }] };
    } catch (err) {
      return toToolError(err);
    }
  },
});
