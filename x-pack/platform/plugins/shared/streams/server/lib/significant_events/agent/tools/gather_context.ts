/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { StaticToolRegistration } from '@kbn/agent-builder-server';
import { z } from '@kbn/zod';
import type { SignificantEventsAgentToolDependencies } from '../tool_dependencies';
import { STREAMS_TOOL_IDS } from './constants';

const timeRangeSchema = z
  .object({
    from: z.string().describe('Start of the time range (e.g. ISO timestamp).'),
    to: z.string().describe('End of the time range (e.g. ISO timestamp).'),
  })
  .optional();

export const GATHER_CONTEXT_TOOL_ID = STREAMS_TOOL_IDS.gather_context;

const schema = z.object({
  stream: z.string().describe('Stream name (e.g. logs.ecs).'),
  time_range: timeRangeSchema.describe('Time range; defaults to full alert window.'),
  rule_uuids: z
    .array(z.string())
    .optional()
    .describe(
      'When provided, include resolved rule metadata (title, asset, stream.name, features) for these kibana.alert.rule.uuid values. Use instead of a separate rule lookup.'
    ),
  depth: z
    .enum(['overview', 'per_rule_detail'])
    .optional()
    .default('overview')
    .describe(
      'Overview: summary only. Per_rule_detail: deeper breakdown when combined with rule_uuids.'
    ),
  include_features: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include stream features (log patterns, dataset analysis).'),
  include_topology: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include top entities (hosts, services, namespaces) with counts.'),
});

export const getGatherContextTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: GATHER_CONTEXT_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Get a decision-ready "weather report" for a stream: total alert volume, percentage of total alert count per rule/stream, top rules by volume and by unique entities affected, per-rule baseline-vs-now (rate change), rule query text, link to associated asset (.kibana_streams_assets), and when available a histogram of alert distribution over time. Rules are grouped by rule family (shared failure class or semantic grouping). Use optional rule_uuids to include resolved rule metadata (title, asset, stream.name, features) for those rules—no separate rule lookup. Also topology from .kibana_streams_features. Call early to understand the landscape.',
  tags: [],
  schema,
  handler: async (_input, context) => {
    const clients = await deps.getScopedClients({ request: context.request });
    void clients;
    return {
      results: [{ type: ToolResultType.other, data: {} }],
    };
  },
});
