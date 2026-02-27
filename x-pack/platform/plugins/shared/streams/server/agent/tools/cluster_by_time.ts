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
    from: z.string().describe('Start of window (e.g. ISO timestamp).'),
    to: z.string().describe('End of window (e.g. ISO timestamp).'),
  })
  .optional();
const resolutionSchema = z.enum(['auto', 'fine', 'coarse']).optional().default('auto');

export const CLUSTER_BY_TIME_TOOL_ID = STREAMS_TOOL_IDS.cluster_by_time;

const schema = z.object({
  stream: z.string().describe('Stream name.'),
  time_range: timeRangeSchema.describe('Window to analyze; defaults to full alert window.'),
  rule_ids: z.array(z.string()).optional().describe('Filter to specific rules; defaults to all.'),
  resolution: resolutionSchema.describe('Cluster granularity: auto, fine, or coarse.'),
  min_cluster_size: z.number().optional().describe('Minimum alerts to form a cluster.'),
});

export const getClusterByTimeTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: CLUSTER_BY_TIME_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Identify time-based Incident Windows (the "Arena"). The tool chooses the split (change-point or density-based); pass optional time_range to zoom. Returns clusters with cluster_id, start, end, alert_count, rule_ids/rule_families per window, peak_rate, and optional background cluster. Use first to scope analysis; then use group_within_window within a chosen window. Optionally pass rule_ids (e.g. from find_changed_queries) to restrict clustering to those rules.',
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
