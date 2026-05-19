/**
 * Stable telemetry contract for Agent Builder route-level application usage tracking.
 * Keep ids stable across releases; rename only as an intentional telemetry contract change.
 */
export declare const agentBuilderViewIds: {
    readonly agentConversation: "agent_builder_conversation";
    readonly agentRoot: "agent_builder_agent_chat";
    readonly agentOverview: "agent_builder_agent_overview";
    readonly agentSkills: "agent_builder_agent_skills";
    readonly agentPlugins: "agent_builder_agent_plugins";
    readonly agentConnectors: "agent_builder_agent_connectors";
    readonly agentTools: "agent_builder_agent_tools";
    readonly manageAgents: "agent_builder_manage_agents";
    readonly manageAgentCreate: "agent_builder_manage_agents_create";
    readonly manageAgentEdit: "agent_builder_manage_agents_edit";
    readonly manageSkills: "agent_builder_manage_skills";
    readonly manageSkillCreate: "agent_builder_manage_skills_create";
    readonly manageSkillDetails: "agent_builder_manage_skills_detail";
    readonly managePlugins: "agent_builder_manage_plugins";
    readonly managePluginDetails: "agent_builder_manage_plugins_detail";
    readonly manageConnectors: "agent_builder_manage_connectors";
    readonly manageTools: "agent_builder_manage_tools";
    readonly manageToolCreate: "agent_builder_manage_tools_create";
    readonly manageToolBulkImportMcp: "agent_builder_manage_tools_bulk_import_mcp";
    readonly manageToolDetails: "agent_builder_manage_tools_detail";
    readonly manageMcpClients: "agent_builder_manage_mcp_clients";
};
