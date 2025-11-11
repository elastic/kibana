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
  'hackathon.catchup.security.attack_discoveries',
  'hackathon.catchup.security.detections',
  'hackathon.catchup.cases',
  'hackathon.catchup.security.rule_changes',
  'hackathon.catchup.security.summary',
  'hackathon.catchup.alerts.by_entities',
  'hackathon.catchup.incident.fetch',
  // Observability CatchUp tools
  'hackathon.catchup.observability.alerts',
  'hackathon.catchup.observability.summary',
  // Search CatchUp tools
  'hackathon.catchup.search.summary',
  'hackathon.catchup.search.unified_search',
  // External CatchUp tools
  'hackathon.catchup.external.slack',
  'hackathon.catchup.external.github',
  'hackathon.catchup.external.gmail',
  // Correlation and Summary tools
  'hackathon.catchup.correlation.engine',
  'hackathon.catchup.correlation.entity_extraction',
  'hackathon.catchup.correlation.semantic_search',
  'hackathon.catchup.summary.generator',
  // Prioritization tools
  'hackathon.catchup.prioritization.rerank',
  // Workflow-specific simplified tools (optimized for workflow execution)
  'hackathon.catchup.workflow.tool.summarizer',
  'hackathon.catchup.workflow.security.summary',
  'hackathon.catchup.workflow.external.slack',
  'hackathon.catchup.workflow.correlation.engine',
  'hackathon.catchup.workflow.prioritization.rerank',
  'hackathon.catchup.workflow.summary.generator',
];

/**
 * This is a manually maintained list of all built-in agents registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new agent.
 */
export const AGENT_BUILDER_BUILTIN_AGENTS: string[] = ['hackathon.catchup.agent'];

export const isAllowedBuiltinTool = (toolName: string) => {
  return AGENT_BUILDER_BUILTIN_TOOLS.includes(toolName);
};

export const isAllowedBuiltinAgent = (agentName: string) => {
  return AGENT_BUILDER_BUILTIN_AGENTS.includes(agentName);
};
