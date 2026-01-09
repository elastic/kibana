/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/onechat-common/tools';
import { internalNamespaces } from '@kbn/onechat-common/base/namespaces';

/**
 * This is a manually maintained list of all built-in tools registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new tool.
 */
export const AGENT_BUILDER_BUILTIN_TOOLS: string[] = [
  // platform core tools are registered from the agent builder plugin so will trigger a review anyway
  ...Object.values(platformCoreTools),

  // Observability
  `${internalNamespaces.observability}.get_data_sources`,
  `${internalNamespaces.observability}.get_anomaly_detection_jobs`,
  `${internalNamespaces.observability}.run_log_rate_analysis`,
  `${internalNamespaces.observability}.get_log_categories`,
  `${internalNamespaces.observability}.get_alerts`,
  `${internalNamespaces.observability}.get_slos`,
  `${internalNamespaces.observability}.get_services`,
  `${internalNamespaces.observability}.get_downstream_dependencies`,
  `${internalNamespaces.observability}.get_correlated_logs`,

  // Dashboards
  'platform.dashboard.create_dashboard',
  'platform.dashboard.update_dashboard',
  // Security Solution
  `${internalNamespaces.security}.entity_risk_score`,
  `${internalNamespaces.security}.cases`,
  `${internalNamespaces.security}.detection_rules`,
  `${internalNamespaces.security}.exception_lists`,
  `${internalNamespaces.security}.timelines`,
  `${internalNamespaces.security}.attack_discovery_search`,
  `${internalNamespaces.security}.security_labs_search`,
  `${internalNamespaces.security}.alerts`,
];

/**
 * This is a manually maintained list of all built-in agents registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new agent.
 */
export const AGENT_BUILDER_BUILTIN_AGENTS: string[] = [
  'observability.agent',
  'platform.dashboard.dashboard_agent',
  `${internalNamespaces.security}.agent`,
];

/**
 * This is a manually maintained list of all built-in skills registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new skill.
 */
export const AGENT_BUILDER_BUILTIN_SKILLS: string[] = [
  'security.get_alerts',
  'security.alert_triage',
  'platform.search',
  'platform.dashboards',
  'platform.visualization',
  'platform.saved_objects',
  'platform.data_views',
  'platform.alerting_rules',
  'platform.connectors_actions',
  'platform.workflows',
  'platform.workflows_logs',
  'platform.cases',
  'platform.spaces',
  'platform.tags',
  'platform.ui_settings',
  'platform.privileges',
  'security.cases',
  'security.detection_rules',
  'security.timelines',
  'security.exception_lists',
  'security.attack_discovery',
  'security.endpoint_readonly',
  'security.threat_intel',
  'security.alert_suppression_readonly',
  'security.rule_exceptions_preview',
  'security.endpoint_response_actions_readonly',
  'observability.alerts',
  'observability.alerts_execution',
  'observability.apm',
  'observability.cases',
  'observability.logs',
  'observability.metrics',
  'observability.slos',
  'observability.slo_readonly',
  'observability.synthetics',
  'fleet.agents',
  'fleet.integrations',
  'ml.jobs_anomaly_detection',
  'ml.data_frame_analytics',
  `${internalNamespaces.security}.entity_analytics`,
  'osquery.entrypoint',
  'osquery.live_query',
  'osquery.packs',
  'osquery.saved_queries',
  'osquery.results',
  'osquery.schema',
  'osquery.status',
];

export const isAllowedBuiltinTool = (toolName: string) => {
  return AGENT_BUILDER_BUILTIN_TOOLS.includes(toolName);
};

export const isAllowedBuiltinAgent = (agentName: string) => {
  return AGENT_BUILDER_BUILTIN_AGENTS.includes(agentName);
};

export const isAllowedBuiltinSkill = (skillId: string) => {
  return AGENT_BUILDER_BUILTIN_SKILLS.includes(skillId);
};
