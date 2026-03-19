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

const createRuleSchema = z.object({
  kind: z
    .enum(['alert', 'signal'])
    .describe(
      'Both kinds share the same base schema and execution pipeline. ' +
        '"alert" rule events carry additional episode.* fields (episode.id, episode.status, episode.status_count) for lifecycle tracking and can trigger notification policies. ' +
        '"signal" rule events are point-in-time observations with no episode fields and no lifecycle tracking.'
    ),
  metadata: z.object({
    name: z.string().describe('Human-readable rule name.'),
    description: z.string().optional().describe('Longer description of the rule purpose.'),
    owner: z.string().optional().describe('Team or user who owns this rule.'),
    labels: z.array(z.string()).optional().describe('Labels for categorization and filtering.'),
  }),
  time_field: z
    .string()
    .describe('The timestamp field used for time-range queries (e.g. "@timestamp").'),
  schedule: z.object({
    every: z.string().describe('ISO 8601 duration for execution interval (e.g. "5m", "1h").'),
    lookback: z
      .string()
      .optional()
      .describe('Lookback window override. Defaults to the schedule interval.'),
  }),
  evaluation: z.object({
    query: z.object({
      base: z
        .string()
        .describe('The base ES|QL query to evaluate (e.g. "FROM logs-* | WHERE status >= 500").'),
      condition: z.string().optional().describe('Additional condition appended to the base query.'),
    }),
  }),
  grouping: z
    .object({
      fields: z
        .array(z.string())
        .describe('Fields to group alerts by (e.g. ["host.name", "service.name"]).'),
    })
    .optional(),
  state_transition: z
    .object({
      pending_count: z
        .number()
        .optional()
        .describe('Number of consecutive breaches before transitioning from pending to active.'),
      pending_timeframe: z.string().optional().describe('Time window for pending threshold.'),
      pending_operator: z.enum(['AND', 'OR']).optional(),
      recovering_count: z.number().optional(),
      recovering_timeframe: z.string().optional(),
      recovering_operator: z.enum(['AND', 'OR']).optional(),
    })
    .optional(),
});

export const createRuleTool = (
  getScopedServices: ScopedServicesFactory
): BuiltinToolDefinition<typeof createRuleSchema> => ({
  id: `${internalNamespaces.alertingV2}.create_rule`,
  type: ToolType.builtin,
  description:
    'Create a new alerting rule from a fully specified definition. The agent should validate the ES|QL query first and confirm with the user before creating.',
  tags: ['alerting'],
  schema: createRuleSchema,
  confirmation: { askUser: 'always' },
  handler: async (params, { request, events, spaceId }) => {
    events.reportProgress('Creating alerting rule...');

    const { rulesClient } = await getScopedServices(request);
    const rule = await rulesClient.createRule({ data: params });

    const basePath = spaceId === 'default' ? '' : `/s/${spaceId}`;
    const ruleUrl = `${basePath}/app/management/insightsAndAlerting/alerting_v2/${encodeURIComponent(
      rule.id
    )}`;

    return {
      results: [
        {
          type: ToolResultType.ruleConfig,
          data: {
            id: rule.id,
            name: rule.metadata.name,
            kind: rule.kind,
            enabled: rule.enabled,
            query: rule.evaluation.query.base,
            schedule: rule.schedule.every,
            lookback: rule.schedule.lookback,
            grouping: rule.grouping?.fields,
            description: rule.metadata.description,
            owner: rule.metadata.owner,
            labels: rule.metadata.labels,
            ruleUrl,
          },
        },
      ],
    };
  },
});
