/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { ScopedServicesFactory } from '../scoped_services';

const listRulesSchema = z.object({
  page: z.number().optional().describe('Page number (1-based). Defaults to 1.'),
  perPage: z.number().optional().describe('Results per page. Defaults to 20.'),
  filter: z
    .string()
    .optional()
    .describe(
      'KQL filter string. Allowed fields: id, kind, enabled, metadata.name, metadata.owner, metadata.labels. ' +
        'Example: "enabled: true AND kind: alert"'
    ),
});

const formatRuleSummary = (rule: RuleResponse) => ({
  id: rule.id,
  name: rule.metadata.name,
  kind: rule.kind,
  enabled: rule.enabled,
  schedule: rule.schedule.every,
  query: rule.evaluation.query.base,
  owner: rule.metadata.owner ?? null,
  labels: rule.metadata.labels ?? [],
});

export const listRulesTool = (
  getScopedServices: ScopedServicesFactory
): BuiltinToolDefinition<typeof listRulesSchema> => ({
  id: `${internalNamespaces.alertingV2}.list_rules`,
  type: ToolType.builtin,
  description:
    'List and search alerting rules with optional filtering. Returns rule summaries including id, name, kind, enabled status, schedule, and query.',
  tags: ['alerting'],
  schema: listRulesSchema,
  handler: async ({ page, perPage }, { request }) => {
    const { rulesClient } = await getScopedServices(request);
    const result = await rulesClient.findRules({ page, perPage });

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            items: result.items.map(formatRuleSummary),
            total: result.total,
            page: result.page,
            perPage: result.perPage,
          },
        },
      ],
    };
  },
});
