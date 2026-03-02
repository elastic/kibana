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

const timeRangeSchema = z.object({ from: z.string(), to: z.string() }).optional();
const clusterFilterSchema = z.object({
  time_range: timeRangeSchema.optional(),
  rule_ids: z.array(z.string()).optional(),
  entity_filter: z.record(z.string(), z.array(z.string())).optional(),
});
const facetsSchema = z
  .array(z.enum(['rules', 'entities', 'message_patterns', 'timeline']))
  .optional()
  .default(['rules', 'entities', 'message_patterns', 'timeline']);

export const DESCRIBE_CLUSTER_TOOL_ID = STREAMS_TOOL_IDS.describe_cluster;

const schema = z.object({
  stream: z.string().describe('Stream name.'),
  clusters: z
    .array(clusterFilterSchema)
    .min(1)
    .describe(
      'One or more cluster definitions (predicate handles from cluster_by_time or group_within_window). When multiple, returns per-cluster descriptions plus impact metrics and a suggested order to inspect.'
    ),
  facets: facetsSchema.describe(
    'Which dimensions: rules, entities, message_patterns, timeline. Defaults to all.'
  ),
  rank_dimensions: z
    .array(z.enum(['alert_volume', 'unique_entities', 'severity', 'growth_vs_baseline']))
    .optional()
    .describe(
      'When clusters.length > 1: dimensions to rank by (alert_volume, unique_entities, severity, growth_vs_baseline). Omit to get descriptions only without ranking.'
    ),
});

export const getDescribeClusterTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: DESCRIBE_CLUSTER_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Describe one or more clusters: structured aggregations (rule families + counts, top entities with %, severity dist, unique_event_count + query_overlap_ratio, cohesion, time span + peak rate, representative messages). Pass clusters as an array of predicate handles from cluster_by_time or group_within_window. When passing multiple clusters, use rank_dimensions to get per-cluster impact metrics and a suggested order to inspect. Use for "what is in this cluster?" and "which cluster should I look at first?"',
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
