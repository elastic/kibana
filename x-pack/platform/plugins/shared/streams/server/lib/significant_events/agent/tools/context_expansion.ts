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

export const CONTEXT_EXPANSION_TOOL_ID = STREAMS_TOOL_IDS.context_expansion;

const schema = z.object({
  stream: z.string().describe('Stream name.'),
  alert_id: z
    .string()
    .optional()
    .describe('Single sampled alert to expand around; use alert_ids for multiple.'),
  alert_ids: z
    .array(z.string())
    .optional()
    .describe('Multiple alerts to expand around in one call (surrounding logs for each).'),
  window_minutes: z.number().optional().default(10).describe('Minutes before/after (e.g. ±5–15).'),
  include_related_entities: z
    .boolean()
    .optional()
    .default(true)
    .describe('Fetch logs for related entities.'),
});

/** Handler must validate: at least one of alert_id or non-empty alert_ids. */
export const getContextExpansionTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: CONTEXT_EXPANSION_TOOL_ID,
  type: ToolType.builtin,
  description:
    'For sampled alerts, fetch surrounding logs for the same entity (±window_minutes) and/or related entities (same service/namespace). Pass alert_id for one alert or alert_ids for multiple. Use after sample_cluster or describe_cluster to enrich triage—alerts alone are often too thin; the neighborhood context is needed for diagnosis.',
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
