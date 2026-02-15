/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';

/**
 * This is a manually maintained list of all built-in tools registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new tool.
 */
export const AGENT_BUILDER_BUILTIN_TOOLS = [
  // platform core tools are registered from the agent builder plugin so will trigger a review anyway
  ...Object.values(platformCoreTools),

  // Observability
  `${internalNamespaces.observability}.get_anomaly_detection_jobs`,
  `${internalNamespaces.observability}.run_log_rate_analysis`,
  `${internalNamespaces.observability}.get_log_groups`,
  `${internalNamespaces.observability}.get_alerts`,
  `${internalNamespaces.observability}.get_services`,
  `${internalNamespaces.observability}.get_downstream_dependencies`,
  `${internalNamespaces.observability}.get_correlated_logs`,
  `${internalNamespaces.observability}.get_hosts`,
  `${internalNamespaces.observability}.get_trace_metrics`,
  `${internalNamespaces.observability}.get_log_change_points`,
  `${internalNamespaces.observability}.get_metric_change_points`,
  `${internalNamespaces.observability}.get_index_info`,
  `${internalNamespaces.observability}.get_trace_change_points`,
  `${internalNamespaces.observability}.get_runtime_metrics`,

  // Dashboards
  'platform.dashboard.manage_dashboard',
  // Security Solution
  `${internalNamespaces.security}.entity_risk_score`,
  `${internalNamespaces.security}.create_detection_rule`,
  `${internalNamespaces.security}.attack_discovery_search`,
  `${internalNamespaces.security}.security_labs_search`,
  `${internalNamespaces.security}.alerts`,
] as const;

export type AgentBuilderBuiltinTool = (typeof AGENT_BUILDER_BUILTIN_TOOLS)[number];

/**
 * This is a manually maintained list of all built-in agents registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new agent.
 */
export const AGENT_BUILDER_BUILTIN_AGENTS = [
  `${internalNamespaces.observability}.agent`,
  'platform.dashboard.dashboard_agent',
  `${internalNamespaces.security}.agent`,
] as const;

export type AgentBuilderBuiltinAgent = (typeof AGENT_BUILDER_BUILTIN_AGENTS)[number];

export const isAllowedBuiltinTool = (toolName: string) => {
  return (AGENT_BUILDER_BUILTIN_TOOLS as readonly string[]).includes(toolName);
};

export const isAllowedBuiltinAgent = (agentName: string) => {
  return (AGENT_BUILDER_BUILTIN_AGENTS as readonly string[]).includes(agentName);
};
