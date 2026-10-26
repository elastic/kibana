/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { GENERATE_DASHBOARD_TOOL_ID } from './extract_dashboard';
import type { DashboardDatasetExample } from './types';

export const TOOL_ONLY_AGENT_ID = 'eval-dashboards-tool-only';

const LOAD_SKILL_TOOL_ID = 'load_skill';

/**
 * Approximates an MCP client of the dashboard tool: the model sees the tool description and input
 * schema plus the discovery tools, never the dashboards skill. Its calls still come from an agent,
 * so the dashboard is stored as a conversation attachment, not a saved object.
 */
export const toolOnlyAgentDefinition = {
  id: TOOL_ONLY_AGENT_ID,
  name: 'Eval: dashboard tool without the dashboards skill',
  description:
    'Approximates an MCP client of the dashboard tool: it sees the tool description and input schema, not the dashboards skill.',
  configuration: {
    tools: [
      {
        tool_ids: [
          GENERATE_DASHBOARD_TOOL_ID,
          platformCoreTools.listIndices,
          platformCoreTools.getIndexMapping,
          platformCoreTools.generateEsql,
          platformCoreTools.executeEsql,
        ],
      },
    ],
    skill_ids: [],
    enable_elastic_capabilities: false,
  },
} as const;

export const isToolOnlyAgentExample = (metadata: DashboardDatasetExample['metadata']): boolean =>
  metadata?.agentId === TOOL_ONLY_AGENT_ID;

/** Runs `example` on the tool-only agent, which has no skill to load on the way to the dashboard. */
export const toToolOnlyExample = (example: DashboardDatasetExample): DashboardDatasetExample => ({
  ...example,
  metadata: { ...example.metadata, agentId: TOOL_ONLY_AGENT_ID },
  output: {
    ...example.output,
    goldenToolPath: example.output?.goldenToolPath?.filter(
      (toolId) => toolId !== LOAD_SKILL_TOOL_ID
    ),
  },
});
