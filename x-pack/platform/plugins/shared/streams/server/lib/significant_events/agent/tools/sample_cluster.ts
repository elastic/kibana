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
const clusterFilterSchema = z
  .object({
    time_range: timeRangeSchema.optional(),
    rule_ids: z.array(z.string()).optional(),
    entity_filter: z.record(z.string(), z.array(z.string())).optional(),
  })
  .optional();
const strategySchema = z
  .enum(['representative', 'diverse', 'recent', 'severe', 'edge_cases'])
  .optional()
  .default('diverse');

export const SAMPLE_CLUSTER_TOOL_ID = STREAMS_TOOL_IDS.sample_cluster;

const schema = z.object({
  stream: z.string().describe('Stream name.'),
  cluster_filter: clusterFilterSchema
    .optional()
    .describe(
      'Predicate handle: filter object (time_range, rule_ids, entity_filter) from cluster_by_time or group_within_window. Omit when sampling over a time window only.'
    ),
  similar_to_centroid_id: z
    .string()
    .optional()
    .describe(
      'Alternative predicate: for semantic clusters, pass the centroid alert ID; backend runs vector search using this.'
    ),
  time_range: timeRangeSchema.describe(
    'Time window. Required when neither cluster_filter nor similar_to_centroid_id is set—then returns a diverse sample over this window (e.g. MMR). Otherwise use to narrow the cluster.'
  ),
  rule_ids: z.array(z.string()).optional(),
  entity_filter: z
    .record(z.string(), z.union([z.string(), z.array(z.string())]))
    .optional()
    .describe(
      'Narrow to specific entities (e.g. host.name, service.name); "show me just this host."'
    ),
  strategy: strategySchema.describe(
    'representative (top fingerprints), diverse (collapse by entity so sample is not all from same host), recent, severe, or edge_cases (rare terms/entities within window).'
  ),
  size: z.number().optional().default(5).describe('Number of samples.'),
  fields: z
    .array(z.string())
    .optional()
    .describe('Which original_source fields to return; request enough for diagnostic value.'),
});

/** Handler must validate: at least one of cluster_filter, similar_to_centroid_id, or time_range. */
export const getSampleClusterTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: SAMPLE_CLUSTER_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Show what is in a cluster or in a time window. Input: predicate handle (cluster_filter from group_within_window/cluster_by_time, or similar_to_centroid_id for semantic clusters), or only time_range (no handle) for a diverse sample over that window. Use entity_filter to narrow (e.g. "just this host"). Samples include distance-from-centroid when applicable and original_source.message. Prefer strategy: diverse so the sample is not all from one host.',
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
