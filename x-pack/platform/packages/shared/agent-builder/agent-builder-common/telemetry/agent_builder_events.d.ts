import type { EventTypeOpts } from '@kbn/core/public';
export declare const AGENT_BUILDER_EVENT_TYPES: {
    readonly OptInAction: "agent_builder_opt_in_action";
    readonly OptOut: "agent_builder_opt_out";
    readonly UiClick: "agent_builder_ui_click";
    readonly AddToChatClicked: "agent_builder_add_to_chat_clicked";
    readonly AgentCreated: "agent_builder_agent_created";
    readonly AgentUpdated: "agent_builder_agent_updated";
    readonly ToolCreated: "agent_builder_tool_created";
    readonly SkillCreated: "agent_builder_skill_created";
    readonly SkillUpdated: "agent_builder_skill_updated";
    readonly SkillDeleted: "agent_builder_skill_deleted";
    readonly SkillInvoked: "agent_builder_skill_invoked";
    readonly PluginImported: "agent_builder_plugin_imported";
    readonly RoundComplete: "agent_builder_round_complete";
    readonly RoundError: "agent_builder_round_error";
    readonly ToolCallSuccess: "agent_builder_tool_call_success";
    readonly ToolCallError: "agent_builder_tool_call_error";
};
export type OptInSource = 'security_settings_menu' | 'stack_management' | 'security_ab_tour' | 'agent_builder_nav_control';
export type OptInAction = 'step_reached' | 'confirmation_shown' | 'confirmed' | 'canceled' | 'error';
export interface ReportOptInActionParams {
    action: OptInAction;
    source: OptInSource;
    /** Announcement modal design variant when the event originates from that flow. */
    announcement_variant?: '1a' | '1b' | '2a';
    /** Whether the user had prior Observability or Security AI Assistant conversations (current space). */
    had_prior_ai_assistant_usage?: boolean;
}
export interface ReportOptOutParams {
    source: 'security_settings_menu' | 'stack_management' | 'agent_builder_nav_control';
    announcement_variant?: '1a' | '1b' | '2a';
    had_prior_ai_assistant_usage?: boolean;
}
export interface ReportAddToChatClickedParams {
    pathway: string;
    attachments?: string[];
}
export type AgentBuilderUiClickElementKind = 'button' | 'link' | 'role_button' | 'input_button' | 'other';
export interface ReportUiClickParams {
    ebt_element: string;
    ebt_action?: string;
    ebt_detail?: string;
    element_kind: AgentBuilderUiClickElementKind;
    location_pathname: string;
}
export interface ReportRoundCompleteParams {
    agent_id: string;
    attachments?: string[];
    conversation_id?: string;
    execution_id?: string;
    input_tokens: number;
    llm_calls: number;
    message_length: number;
    model?: string;
    model_provider?: string;
    output_tokens: number;
    round_id: string;
    response_length: number;
    round_number: number;
    round_status: string;
    started_at: string;
    time_to_first_token: number;
    time_to_last_token: number;
    tool_calls: number;
    tool_call_errors: number;
    tools_invoked: string[];
}
export interface ReportRoundErrorParams {
    error_type: string;
    error_message: string;
    model_provider?: string;
    conversation_id?: string;
    execution_id?: string;
    agent_id: string;
    round_id?: string;
}
export interface ReportAgentCreatedParams {
    agent_id: string;
    tool_ids: string[];
}
export interface ReportAgentUpdatedParams {
    agent_id: string;
    tool_ids: string[];
}
export interface ReportToolCreatedParams {
    tool_id: string;
    tool_type: string;
}
/** Origin of a skill: `custom` for user-created via the public API, `plugin` for plugin-bundled. */
export type SkillCreationOrigin = 'custom' | 'plugin';
/** Origin of a skill at invocation time: `builtin`, `custom` (user-created), or `plugin` (plugin-installed). */
export type SkillInvocationOrigin = 'builtin' | 'custom' | 'plugin';
/**
 * Solution area a skill belongs to. Built-in skills are classified by their `basePath`.
 * Custom (user-created) skills are reported as `custom`. Plugin-backed skills are
 * reported as `plugin`. `unknown` is reserved for built-ins whose `basePath` does not
 * match any known prefix.
 */
export type SkillSolutionArea = 'security' | 'observability' | 'search' | 'platform' | 'custom' | 'plugin' | 'unknown';
/** Telemetry params reported when a user-created skill is created. */
export interface ReportSkillCreatedParams {
    /**
     * Identifier of the created skill, normalized for privacy. Custom skills are
     * reported as `custom-<sha256_prefix>`; plugin-bundled creates as
     * `plugin-<plugin_id_hash>-<sha256_prefix>`.
     */
    skill_id: string;
    /** Optional origin (`custom` for direct API creates, `plugin` for plugin-bundled creates). */
    origin?: SkillCreationOrigin;
}
/** Telemetry params reported when a user-created skill is updated. */
export interface ReportSkillUpdatedParams {
    /**
     * Identifier of the updated skill, normalized for privacy. Custom skills are
     * reported as `custom-<sha256_prefix>`; plugin-bundled updates as
     * `plugin-<plugin_id_hash>-<sha256_prefix>`.
     */
    skill_id: string;
    /** Optional origin (`custom` for direct API updates, `plugin` for plugin-bundled updates). */
    origin?: SkillCreationOrigin;
}
/** Telemetry params reported when a user-created skill is deleted. */
export interface ReportSkillDeletedParams {
    /**
     * Identifier of the deleted skill, normalized for privacy. Custom skills are
     * reported as `custom-<sha256_prefix>`; plugin-bundled deletes as
     * `plugin-<plugin_id_hash>-<sha256_prefix>`.
     */
    skill_id: string;
    /** Optional origin (`custom` for direct API deletes, `plugin` for plugin-bundled deletes). */
    origin?: SkillCreationOrigin;
}
/** Telemetry params reported when a skill is invoked (loaded into the active tool set). */
export interface ReportSkillInvokedParams {
    /**
     * ID of the invoked skill. Built-in skills keep their ID; custom skills are reported as
     * `custom-<sha256_prefix>`; plugin-backed skills as `plugin-<plugin_id_hash>-<sha256_prefix>`.
     */
    skill_id: string;
    /** Where this skill came from. */
    origin: SkillInvocationOrigin;
    /** Solution area derived from the skill's `basePath` (built-ins) or origin. */
    solution_area: SkillSolutionArea;
    /** Normalized plugin ID. Present when `origin === 'plugin'`. */
    plugin_id?: string;
    /** Normalized agent ID running this skill, when known. */
    agent_id?: string;
    /** Conversation ID, when known. */
    conversation_id?: string;
    /** Agent execution ID, when known. */
    execution_id?: string;
    /** Number of tools dynamically registered by this skill load. */
    tool_count: number;
}
/** Telemetry params reported when a custom plugin is imported (URL or upload). */
export interface ReportPluginImportedParams {
    /** Normalized plugin ID. */
    plugin_id: string;
    /** Where the plugin came from. */
    source_type: 'url' | 'upload';
    /** Number of persisted skills bundled with the plugin. */
    skill_count: number;
}
export interface ReportToolCallSuccessParams {
    tool_id: string;
    tool_call_id: string;
    source: string;
    agent_id?: string;
    conversation_id?: string;
    execution_id?: string;
    model?: string;
    result_types: string[];
    duration_ms: number;
}
export interface ReportToolCallErrorParams {
    tool_id: string;
    tool_call_id: string;
    source: string;
    agent_id?: string;
    conversation_id?: string;
    execution_id?: string;
    model?: string;
    error_type: string;
    error_message: string;
    duration_ms: number;
}
export interface AgentBuilderTelemetryEventsMap {
    [AGENT_BUILDER_EVENT_TYPES.OptInAction]: ReportOptInActionParams;
    [AGENT_BUILDER_EVENT_TYPES.OptOut]: ReportOptOutParams;
    [AGENT_BUILDER_EVENT_TYPES.UiClick]: ReportUiClickParams;
    [AGENT_BUILDER_EVENT_TYPES.AddToChatClicked]: ReportAddToChatClickedParams;
    [AGENT_BUILDER_EVENT_TYPES.AgentCreated]: ReportAgentCreatedParams;
    [AGENT_BUILDER_EVENT_TYPES.AgentUpdated]: ReportAgentUpdatedParams;
    [AGENT_BUILDER_EVENT_TYPES.ToolCreated]: ReportToolCreatedParams;
    /** Fired when a user-created skill is created. */
    [AGENT_BUILDER_EVENT_TYPES.SkillCreated]: ReportSkillCreatedParams;
    /** Fired when a user-created skill is updated. */
    [AGENT_BUILDER_EVENT_TYPES.SkillUpdated]: ReportSkillUpdatedParams;
    /** Fired when a user-created skill is deleted. */
    [AGENT_BUILDER_EVENT_TYPES.SkillDeleted]: ReportSkillDeletedParams;
    /** Fired when a skill is invoked (its tools are dynamically registered for the agent). */
    [AGENT_BUILDER_EVENT_TYPES.SkillInvoked]: ReportSkillInvokedParams;
    /** Fired when a custom plugin is imported. */
    [AGENT_BUILDER_EVENT_TYPES.PluginImported]: ReportPluginImportedParams;
    [AGENT_BUILDER_EVENT_TYPES.RoundComplete]: ReportRoundCompleteParams;
    [AGENT_BUILDER_EVENT_TYPES.RoundError]: ReportRoundErrorParams;
    [AGENT_BUILDER_EVENT_TYPES.ToolCallSuccess]: ReportToolCallSuccessParams;
    [AGENT_BUILDER_EVENT_TYPES.ToolCallError]: ReportToolCallErrorParams;
}
export type AgentBuilderTelemetryEvent = EventTypeOpts<ReportOptInActionParams> | EventTypeOpts<ReportOptOutParams> | EventTypeOpts<ReportUiClickParams> | EventTypeOpts<ReportAddToChatClickedParams> | EventTypeOpts<ReportAgentCreatedParams> | EventTypeOpts<ReportAgentUpdatedParams> | EventTypeOpts<ReportToolCreatedParams> | EventTypeOpts<ReportSkillCreatedParams> | EventTypeOpts<ReportSkillUpdatedParams> | EventTypeOpts<ReportSkillDeletedParams> | EventTypeOpts<ReportSkillInvokedParams> | EventTypeOpts<ReportPluginImportedParams> | EventTypeOpts<ReportRoundCompleteParams> | EventTypeOpts<ReportRoundErrorParams> | EventTypeOpts<ReportToolCallSuccessParams> | EventTypeOpts<ReportToolCallErrorParams>;
export type AgentBuilderEventTypes = typeof AGENT_BUILDER_EVENT_TYPES.OptInAction | typeof AGENT_BUILDER_EVENT_TYPES.OptOut | typeof AGENT_BUILDER_EVENT_TYPES.UiClick | typeof AGENT_BUILDER_EVENT_TYPES.AddToChatClicked | typeof AGENT_BUILDER_EVENT_TYPES.AgentCreated | typeof AGENT_BUILDER_EVENT_TYPES.AgentUpdated | typeof AGENT_BUILDER_EVENT_TYPES.ToolCreated | typeof AGENT_BUILDER_EVENT_TYPES.SkillCreated | typeof AGENT_BUILDER_EVENT_TYPES.SkillUpdated | typeof AGENT_BUILDER_EVENT_TYPES.SkillDeleted | typeof AGENT_BUILDER_EVENT_TYPES.SkillInvoked | typeof AGENT_BUILDER_EVENT_TYPES.PluginImported | typeof AGENT_BUILDER_EVENT_TYPES.RoundComplete | typeof AGENT_BUILDER_EVENT_TYPES.RoundError | typeof AGENT_BUILDER_EVENT_TYPES.ToolCallSuccess | typeof AGENT_BUILDER_EVENT_TYPES.ToolCallError;
export declare const agentBuilderPublicEbtEvents: Array<EventTypeOpts<Record<string, unknown>>>;
export declare const agentBuilderServerEbtEvents: Array<EventTypeOpts<Record<string, unknown>>>;
