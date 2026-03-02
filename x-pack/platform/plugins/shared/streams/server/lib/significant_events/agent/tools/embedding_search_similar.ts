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

const timeRangeSchema = z.object({ from: z.string(), to: z.string() });

export const EMBEDDING_SEARCH_SIMILAR_TOOL_ID = STREAMS_TOOL_IDS.embedding_search_similar;

const schema = z.object({
  stream: z.string().describe('Stream name.'),
  seed_alert_id: z
    .string()
    .optional()
    .describe('Alert _id to use as seed; embeddings from original_source.'),
  seed_alert_ids: z
    .array(z.string())
    .optional()
    .describe('Alternative: multiple alert IDs to derive seed.'),
  time_range: timeRangeSchema.describe('Time window to search within (required).'),
  rule_ids: z.array(z.string()).optional().describe('Filter to specific rules.'),
  entity_filter: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  k: z.number().optional().default(20).describe('Number of nearest neighbors to return.'),
});

/** Handler must validate: at least one of seed_alert_id or non-empty seed_alert_ids. */
export const getEmbeddingSearchSimilarTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: EMBEDDING_SEARCH_SIMILAR_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Given a seed alert (or seed_alert_ids) and a time_range, retrieve nearest neighbors by embedding similarity (kNN on original_source embeddings). Use to expand "find more like this" within a window—e.g. after sampling one alert. Use for sampling and find-more-like-this; prefer time + entity + fingerprint (cluster_by_time, group_within_window) for primary grouping.',
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
