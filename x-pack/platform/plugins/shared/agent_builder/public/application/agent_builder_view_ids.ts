/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable telemetry contract for Agent Builder route-level application usage tracking.
 * Keep ids stable across releases; rename only as an intentional telemetry contract change.
 */
export const agentBuilderViewIds = {
  agentConversation: 'agent_builder_conversation',
  agentRoot: 'agent_builder_agent_chat',
  agentOverview: 'agent_builder_agent_overview',
  agentSkills: 'agent_builder_agent_skills',
  agentPlugins: 'agent_builder_agent_plugins',
  agentConnectors: 'agent_builder_agent_connectors',
  agentTools: 'agent_builder_agent_tools',
  manageAgents: 'agent_builder_manage_agents',
  manageAgentCreate: 'agent_builder_manage_agents_create',
  manageAgentEdit: 'agent_builder_manage_agents_edit',
  manageSkills: 'agent_builder_manage_skills',
  manageSkillCreate: 'agent_builder_manage_skills_create',
  manageSkillDetails: 'agent_builder_manage_skills_detail',
  managePlugins: 'agent_builder_manage_plugins',
  managePluginDetails: 'agent_builder_manage_plugins_detail',
  manageConnectors: 'agent_builder_manage_connectors',
  manageTools: 'agent_builder_manage_tools',
  manageToolCreate: 'agent_builder_manage_tools_create',
  manageToolBulkImportMcp: 'agent_builder_manage_tools_bulk_import_mcp',
  manageToolDetails: 'agent_builder_manage_tools_detail',
  manageMcpClients: 'agent_builder_manage_mcp_clients',
} as const;
