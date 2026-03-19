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
import type { ScopedServicesFactory } from '../scoped_services';

const explainRuleQuerySchema = z.object({
  ruleId: z.string().describe('The ID of the rule whose query to explain.'),
  limit: z
    .number()
    .optional()
    .describe('Max rows to fetch when running a sample query. Defaults to 5.'),
});

export const explainRuleQueryTool = (
  getScopedServices: ScopedServicesFactory
): BuiltinToolDefinition<typeof explainRuleQuerySchema> => ({
  id: `${internalNamespaces.alertingV2}.explain_rule_query`,
  type: ToolType.builtin,
  description:
    'Fetch an alerting rule, run its ES|QL query with a small LIMIT to return a sample of matching documents, and provide context for the agent to explain what the rule detects.',
  tags: ['alerting'],
  schema: explainRuleQuerySchema,
  handler: async ({ ruleId, limit }, { request, esClient }) => {
    const { rulesClient } = await getScopedServices(request);
    const rule = await rulesClient.getRule({ id: ruleId });

    const sampleLimit = limit ?? 5;
    const query = `${rule.evaluation.query.base} | LIMIT ${sampleLimit}`;

    const result = await esClient.asCurrentUser.transport.request<{
      columns: Array<{ name: string; type: string }>;
      values: unknown[][];
    }>({
      method: 'POST',
      path: '/_query',
      body: { query },
    });

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            rule: {
              id: rule.id,
              name: rule.metadata.name,
              kind: rule.kind,
              query: rule.evaluation.query,
              schedule: rule.schedule,
              grouping: rule.grouping,
              state_transition: rule.state_transition,
            },
          },
        },
        {
          type: ToolResultType.esqlResults,
          data: {
            query,
            columns: result.columns,
            values: result.values,
          },
        },
      ],
    };
  },
});
