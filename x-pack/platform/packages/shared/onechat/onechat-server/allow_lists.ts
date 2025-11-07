/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * This is a manually maintained list of all built-in tools registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new tool.
 */
export const AGENT_BUILDER_BUILTIN_TOOLS: string[] = [
  // Security CatchUp tools
  'platform.catchup.security.attack_discoveries',
  'platform.catchup.security.detections',
  'platform.catchup.cases',
  'platform.catchup.security.rule_changes',
  'platform.catchup.security.summary',
  // Observability CatchUp tools
  'platform.catchup.observability.summary',
  // Search CatchUp tools
  'platform.catchup.search.summary',
  'platform.catchup.search.unified_search',
  // External CatchUp tools
  'platform.catchup.external.slack',
  'platform.catchup.external.github',
  'platform.catchup.external.gmail',
  // Correlation and Summary tools
  'platform.catchup.correlation.engine',
  'platform.catchup.correlation.entity_extraction',
  'platform.catchup.correlation.semantic_search',
  'platform.catchup.summary.generator',
  // Prioritization tools
  'platform.catchup.prioritization.rerank',
  // Workflow-specific simplified tools (optimized for workflow execution)
  'platform.catchup.workflow.security.summary',
  'platform.catchup.workflow.external.slack',
  'platform.catchup.workflow.correlation.engine',
  'platform.catchup.workflow.prioritization.rerank',
];

/**
 * This is a manually maintained list of all built-in agents registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new agent.
 */
export const AGENT_BUILDER_BUILTIN_AGENTS: string[] = ['platform.catchup.agent'];

export const isAllowedBuiltinTool = (toolName: string) => {
  return AGENT_BUILDER_BUILTIN_TOOLS.includes(toolName);
};

export const isAllowedBuiltinAgent = (agentName: string) => {
  return AGENT_BUILDER_BUILTIN_AGENTS.includes(agentName);
};
