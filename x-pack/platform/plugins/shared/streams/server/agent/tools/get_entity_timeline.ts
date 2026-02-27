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

export const GET_ENTITY_TIMELINE_TOOL_ID = STREAMS_TOOL_IDS.get_entity_timeline;

const schema = z.object({
  stream: z.string().describe('Stream name.'),
  entity_type: z.string().describe('Entity dimension (e.g. host.name, service.name).'),
  entity_id: z.string().describe('Entity value (e.g. host-01).'),
  time_range: timeRangeSchema.optional(),
});

export const getGetEntityTimelineTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: GET_ENTITY_TIMELINE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Chronological alert timeline for one entity (e.g. host.name, service.name) across all rules, grouped by rule. Use when an entity appears in multiple clusters and you need root-cause reasoning or to see temporal order of alerts for that entity. No ad-hoc ES|QL needed.',
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
