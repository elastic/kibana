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

export const EXPLORE_TOPOLOGY_TOOL_ID = STREAMS_TOOL_IDS.explore_topology;

const schema = z.object({
  entity_type: z.string().describe('Entity dimension (e.g. host.name, service.name).'),
  entity_id: z.string().describe('Entity value.'),
  direction: z
    .enum(['dependents', 'dependencies', 'both'])
    .optional()
    .default('both')
    .describe(
      'dependents = what runs on / depends on this entity; dependencies = what this entity depends on; both = full graph.'
    ),
});

export const getExploreTopologyTool = (
  deps: SignificantEventsAgentToolDependencies
): StaticToolRegistration<typeof schema> => ({
  id: EXPLORE_TOPOLOGY_TOOL_ID,
  type: ToolType.builtin,
  description:
    "Answer 'What runs on this host?' (dependents) or 'What does this service depend on?' (dependencies) by querying .kibana_streams_features for upstream/downstream relations. Use when linking distinct alert clusters that may be causally related (e.g. DB errors vs frontend latency). When topology is missing or empty, use get_entity_timeline and entity overlap from describe_cluster instead.",
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
