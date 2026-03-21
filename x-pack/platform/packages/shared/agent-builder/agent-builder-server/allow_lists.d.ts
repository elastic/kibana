/**
 * This is a manually maintained list of all built-in tools registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new tool.
 */
export declare const AGENT_BUILDER_BUILTIN_TOOLS: readonly [...("platform.core.index_explorer" | "platform.core.search" | "platform.core.list_indices" | "platform.core.get_index_mapping" | "platform.core.get_document_by_id" | "platform.core.generate_esql" | "platform.core.execute_esql" | "platform.core.create_visualization" | "platform.core.get_workflow_execution_status" | "platform.core.product_documentation" | "platform.core.cases" | "platform.core.integration_knowledge" | "platform.core.sml_search" | "platform.core.sml_attach" | "platform.streams.sig_events.search_knowledge_indicators")[], "observability.get_anomaly_detection_jobs", "observability.run_log_rate_analysis", "observability.get_log_groups", "observability.get_alerts", "observability.get_services", "observability.get_hosts", "observability.get_trace_metrics", "observability.get_log_change_points", "observability.get_metric_change_points", "observability.get_index_info", "observability.get_trace_change_points", "observability.get_service_topology", "observability.get_traces", "observability.get_runtime_metrics", "observability.get_logs", "security.entity_risk_score", "security.create_detection_rule", "security.attack_discovery_search", "security.security_labs_search", "security.alerts", "security.get_entity", "security.search_entities", "platform.workflows.validate_workflow", "platform.workflows.get_step_definitions", "platform.workflows.get_trigger_definitions", "platform.workflows.get_connectors", "platform.workflows.list_workflows", "platform.workflows.get_workflow", "platform.workflows.get_examples"];
export type AgentBuilderBuiltinTool = (typeof AGENT_BUILDER_BUILTIN_TOOLS)[number];
/**
 * This is a manually maintained list of all built-in agents registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new agent.
 */
export declare const AGENT_BUILDER_BUILTIN_AGENTS: readonly ["observability.agent", "security.agent"];
export type AgentBuilderBuiltinAgent = (typeof AGENT_BUILDER_BUILTIN_AGENTS)[number];
export declare const isAllowedBuiltinTool: (toolName: string) => boolean;
export declare const isAllowedBuiltinAgent: (agentName: string) => boolean;
/**
 * This is a manually maintained list of all built-in skills registered in Agent Builder.
 * The intention is to force a code review from the Agent Builder team when any team adds a new skill.
 */
export declare const AGENT_BUILDER_BUILTIN_SKILLS: readonly ["data-exploration", "visualization-creation", "dashboard-management", "find-security-ml-jobs", "automatic_troubleshooting", "entity-analytics", "alert-analysis", "observability.log-search"];
export type AgentBuilderBuiltinSkill = (typeof AGENT_BUILDER_BUILTIN_SKILLS)[number];
export declare const isAllowedBuiltinSkill: (skillId: string) => boolean;
