/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/onechat-common/tools';

/**
 * This is a manually maintained list of all built-in tools registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new tool.
 */
export const AGENT_BUILDER_BUILTIN_TOOLS: string[] = [
  // platform core tools are registered from the agent builder plugin so will trigger a review anyway
  ...Object.values(platformCoreTools),
  // Observability
  'observability.search_knowledge_base',
  'observability.get_data_sources',
  'observability.get_alerts',

  // Security
  'entity-analytics-tool',
];

/**
 * This is a manually maintained list of all built-in agents registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new agent.
 */
export const AGENT_BUILDER_BUILTIN_AGENTS: string[] = [
  'observability.agent',
  'siem-entity-analytics',
];

export const isAllowedBuiltinTool = (toolName: string) => {
  return AGENT_BUILDER_BUILTIN_TOOLS.includes(toolName);
};

export const isAllowedBuiltinAgent = (agentName: string) => {
  return AGENT_BUILDER_BUILTIN_AGENTS.includes(agentName);
};
