/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools, platformStreamsSigEventsTools } from '@kbn/agent-builder-common/tools';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';

/**
 * This is a manually maintained list of all built-in tools registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new tool.
 */
export const AGENT_BUILDER_BUILTIN_TOOLS = [
  // platform core tools are registered from the agent builder plugin so will trigger a review anyway
  ...Object.values(platformCoreTools),
  // Streams / Significant Events
  ...Object.values(platformStreamsSigEventsTools),

  // Observability
  `${internalNamespaces.observability}.get_anomaly_detection_jobs`,
  `${internalNamespaces.observability}.run_log_rate_analysis`,
  `${internalNamespaces.observability}.get_log_groups`,
  `${internalNamespaces.observability}.get_alerts`,
  `${internalNamespaces.observability}.get_services`,
  `${internalNamespaces.observability}.get_hosts`,
  `${internalNamespaces.observability}.get_trace_metrics`,
  `${internalNamespaces.observability}.get_log_change_points`,
  `${internalNamespaces.observability}.get_metric_change_points`,
  `${internalNamespaces.observability}.get_index_info`,
  `${internalNamespaces.observability}.get_trace_change_points`,
  `${internalNamespaces.observability}.get_service_topology`,
  `${internalNamespaces.observability}.get_traces`,
  `${internalNamespaces.observability}.get_runtime_metrics`,
  `${internalNamespaces.observability}.get_logs`,
  `${internalNamespaces.observability}.get_apm_correlations`,

  // Security Solution
  `${internalNamespaces.security}.entity_risk_score`,
  `${internalNamespaces.security}.create_detection_rule`,
  `${internalNamespaces.security}.attack_discovery_search`,
  `${internalNamespaces.security}.security_labs_search`,
  `${internalNamespaces.security}.alerts`,
  `${internalNamespaces.security}.get_entity`,
  `${internalNamespaces.security}.search_entities`,

  // Streams – read
  `${internalNamespaces.streams}.list_streams`,
  `${internalNamespaces.streams}.get_stream`,
  `${internalNamespaces.streams}.get_schema`,
  `${internalNamespaces.streams}.get_data_quality`,
  `${internalNamespaces.streams}.get_lifecycle_stats`,
  `${internalNamespaces.streams}.query_documents`,
  `${internalNamespaces.streams}.get_failed_documents`,

  // Streams – write
  `${internalNamespaces.streams}.set_retention`,
  `${internalNamespaces.streams}.fork_stream`,
  `${internalNamespaces.streams}.delete_stream`,
  `${internalNamespaces.streams}.update_processors`,
  `${internalNamespaces.streams}.map_fields`,
  `${internalNamespaces.streams}.set_failure_store`,
  `${internalNamespaces.streams}.update_stream_description`,

  // Workflows
  `${internalNamespaces.workflows}.validate_workflow`,
  `${internalNamespaces.workflows}.get_step_definitions`,
  `${internalNamespaces.workflows}.get_trigger_definitions`,
  `${internalNamespaces.workflows}.get_connectors`,
  `${internalNamespaces.workflows}.list_workflows`,
  `${internalNamespaces.workflows}.get_workflow`,
  `${internalNamespaces.workflows}.get_examples`,
  `${internalNamespaces.workflows}.workflow_insert_step`,
  `${internalNamespaces.workflows}.workflow_modify_step`,
  `${internalNamespaces.workflows}.workflow_modify_step_property`,
  `${internalNamespaces.workflows}.workflow_modify_property`,
  `${internalNamespaces.workflows}.workflow_delete_step`,
  `${internalNamespaces.workflows}.workflow_set_yaml`,
] as const;

export type AgentBuilderBuiltinTool = (typeof AGENT_BUILDER_BUILTIN_TOOLS)[number];

/**
 * This is a manually maintained list of all built-in agents registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new agent.
 */
export const AGENT_BUILDER_BUILTIN_AGENTS = [
  `${internalNamespaces.search}.agent`,
  `${internalNamespaces.security}.agent`,
] as const;

export type AgentBuilderBuiltinAgent = (typeof AGENT_BUILDER_BUILTIN_AGENTS)[number];

export const isAllowedBuiltinTool = (toolName: string) => {
  return (AGENT_BUILDER_BUILTIN_TOOLS as readonly string[]).includes(toolName);
};

export const isAllowedBuiltinAgent = (agentName: string) => {
  return (AGENT_BUILDER_BUILTIN_AGENTS as readonly string[]).includes(agentName);
};

/**
 * This is a manually maintained list of all built-in skills registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new skill.
 */
export const AGENT_BUILDER_BUILTIN_SKILLS = [
  // Platform
  'data-exploration',
  'visualization-creation',
  'graph-creation',

  // Platform – Dashboard
  'dashboard-management',

  // Platform – Discover
  'discover-data-analysis',

  // Platform – Streams
  'streams-management',
  'significant-events-memory',
  'knowledge-indicators-management',

  // Platform – Workflows
  'workflow-authoring',

  // Security Solution
  'find-security-ml-jobs',
  'automatic_troubleshooting',
  'entity-analytics',
  'alert-analysis',
  'detection-rule-edit',
  'threat-hunting',

  // O11Y
  'observability.rca',
  'observability.investigation',
  'observability.service-map',

  // Search
  `${internalNamespaces.search}.keyword-search`,
  `${internalNamespaces.search}.catalog-ecommerce`,
  `${internalNamespaces.search}.elasticsearch-onboarding`,
  `${internalNamespaces.search}.vector-hybrid-search`,
  `${internalNamespaces.search}.rag-chatbot`,
  `${internalNamespaces.search}.use-case-library`,
] as const;

export type AgentBuilderBuiltinSkill = (typeof AGENT_BUILDER_BUILTIN_SKILLS)[number];

export const isAllowedBuiltinSkill = (skillId: string) => {
  return (AGENT_BUILDER_BUILTIN_SKILLS as readonly string[]).includes(skillId);
};

/**
 * This is a manually maintained list of all built-in plugins registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new plugin.
 */
export const AGENT_BUILDER_BUILTIN_PLUGINS = [] as const;

export type AgentBuilderBuiltinPlugin = (typeof AGENT_BUILDER_BUILTIN_PLUGINS)[number];

export const isAllowedBuiltinPlugin = (pluginId: string) => {
  return (AGENT_BUILDER_BUILTIN_PLUGINS as readonly string[]).includes(pluginId);
};
