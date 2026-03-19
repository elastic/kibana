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

const updateRuleSchema = z.object({
  ruleId: z.string().describe('The ID of the rule to update.'),
  updates: z
    .object({
      metadata: z
        .object({
          name: z.string().optional(),
          description: z.string().optional(),
          owner: z.string().optional(),
          labels: z.array(z.string()).optional(),
        })
        .optional(),
      schedule: z
        .object({
          every: z.string().optional(),
          lookback: z.string().optional(),
        })
        .optional(),
      evaluation: z
        .object({
          query: z.object({
            base: z.string().optional(),
            condition: z.string().optional(),
          }),
        })
        .optional(),
      state_transition: z
        .object({
          pending_count: z.number().optional(),
          pending_timeframe: z.string().optional(),
          pending_operator: z.enum(['AND', 'OR']).optional(),
          recovering_count: z.number().optional(),
          recovering_timeframe: z.string().optional(),
          recovering_operator: z.enum(['AND', 'OR']).optional(),
        })
        .optional(),
    })
    .describe('Partial update — only provided fields are changed.'),
});

export const updateRuleTool = (
  getScopedServices: ScopedServicesFactory
): BuiltinToolDefinition<typeof updateRuleSchema> => ({
  id: `${internalNamespaces.alertingV2}.update_rule`,
  type: ToolType.builtin,
  description:
    'Update an existing alerting rule configuration (schedule, query, metadata, state transitions, etc.). Only provided fields are changed.',
  tags: ['alerting'],
  schema: updateRuleSchema,
  handler: async ({ ruleId, updates }, { request, events }) => {
    events.reportProgress('Updating rule...');

    const { rulesClient } = await getScopedServices(request);
    const rule = await rulesClient.updateRule({ id: ruleId, data: updates });

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            message: `Rule "${rule.metadata.name}" updated successfully.`,
            rule,
          },
        },
      ],
    };
  },
});
