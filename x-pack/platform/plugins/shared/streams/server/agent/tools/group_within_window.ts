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

export const GROUP_WITHIN_WINDOW_TOOL_ID = STREAMS_TOOL_IDS.group_within_window;

const methodSchema = z.enum(['by_attribute', 'by_semantic', 'by_frequent_patterns']);

const schema = z.object({
  stream: z.string().describe('Stream name.'),
  time_range: timeRangeSchema.describe(
    'Time window to group within (e.g. an incident window from cluster_by_time).'
  ),
  rule_ids: z.array(z.string()).optional().describe('Filter to specific rules.'),
  method: methodSchema.describe(
    'How to group: by_attribute (structured field, e.g. host/service/rule), by_semantic (embedding similarity), or by_frequent_patterns (message patterns like significant_terms). Prefer by_attribute or by_frequent_patterns when they fit; use by_semantic when alerts are phrased differently but mean the same thing.'
  ),
  // by_attribute
  attribute: z
    .string()
    .optional()
    .describe(
      'Required when method=by_attribute. Field to group by, e.g. host.name, service.name, kibana.alert.rule.uuid, original_source.stream.name, or error.fingerprint when present at ingestion.'
    ),
  // by_semantic
  group_by: z
    .enum(['none', 'host.name', 'service.name'])
    .optional()
    .default('none')
    .describe('When method=by_semantic: pre-partition by this field before clustering.'),
  max_clusters: z
    .number()
    .optional()
    .default(10)
    .describe('When method=by_semantic: upper bound on number of clusters.'),
  distance_threshold: z
    .number()
    .optional()
    .default(0.3)
    .describe('When method=by_semantic: similarity threshold.'),
  // by_frequent_patterns
  pattern_field: z
    .string()
    .optional()
    .default('message')
    .describe(
      'When method=by_frequent_patterns: field to extract patterns from (e.g. significant_terms, categorize_text).'
    ),
  max_groups: z
    .number()
    .optional()
    .default(20)
    .describe('When method=by_frequent_patterns: maximum number of groups to return.'),
});

/** Handler must validate: when method is "by_attribute", attribute is required. */
export const getGroupWithinWindowTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: GROUP_WITHIN_WINDOW_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Break down a time window into sub-groups. Choose method: by_attribute (group by a structured field—e.g. host.name, service.name, kibana.alert.rule.uuid, error.fingerprint; requires attribute param), by_frequent_patterns (group by repeated message patterns—best when many alerts share the same text), or by_semantic (group by embedding similarity—best when phrasing varies but meaning is the same). Returns predicate handles per group for sample_cluster and describe_cluster.',
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
