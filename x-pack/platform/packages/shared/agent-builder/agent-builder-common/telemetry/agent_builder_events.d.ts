import type { EventTypeOpts } from '@kbn/core/public';
export declare const AGENT_BUILDER_EVENT_TYPES: {
    readonly OptInAction: "agent_builder_opt_in_action";
    readonly OptOut: "agent_builder_opt_out";
    readonly AddToChatClicked: "agent_builder_add_to_chat_clicked";
    readonly AgentCreated: "agent_builder_agent_created";
    readonly AgentUpdated: "agent_builder_agent_updated";
    readonly ToolCreated: "agent_builder_tool_created";
    readonly SkillCreated: "agent_builder_skill_created";
    readonly SkillUpdated: "agent_builder_skill_updated";
    readonly SkillDeleted: "agent_builder_skill_deleted";
    readonly RoundComplete: "agent_builder_round_complete";
    readonly RoundError: "agent_builder_round_error";
    readonly ToolCallSuccess: "agent_builder_tool_call_success";
    readonly ToolCallError: "agent_builder_tool_call_error";
};
export type OptInSource = 'security_settings_menu' | 'stack_management' | 'security_ab_tour';
export type OptInAction = 'step_reached' | 'confirmation_shown' | 'confirmed' | 'canceled' | 'error';
export interface ReportOptInActionParams {
    action: OptInAction;
    source: OptInSource;
}
export interface ReportOptOutParams {
    source: 'security_settings_menu' | 'stack_management';
}
export interface ReportAddToChatClickedParams {
    pathway: string;
    attachments?: string[];
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
/** Telemetry params reported when a user-created skill is created. */
export interface ReportSkillCreatedParams {
    /** Identifier of the created skill. */
    skill_id: string;
}
/** Telemetry params reported when a user-created skill is updated. */
export interface ReportSkillUpdatedParams {
    /** Identifier of the updated skill. */
    skill_id: string;
}
/** Telemetry params reported when a user-created skill is deleted. */
export interface ReportSkillDeletedParams {
    /** Identifier of the deleted skill. */
    skill_id: string;
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
    [AGENT_BUILDER_EVENT_TYPES.RoundComplete]: ReportRoundCompleteParams;
    [AGENT_BUILDER_EVENT_TYPES.RoundError]: ReportRoundErrorParams;
    [AGENT_BUILDER_EVENT_TYPES.ToolCallSuccess]: ReportToolCallSuccessParams;
    [AGENT_BUILDER_EVENT_TYPES.ToolCallError]: ReportToolCallErrorParams;
}
export type AgentBuilderTelemetryEvent = EventTypeOpts<ReportOptInActionParams> | EventTypeOpts<ReportOptOutParams> | EventTypeOpts<ReportAddToChatClickedParams> | EventTypeOpts<ReportAgentCreatedParams> | EventTypeOpts<ReportAgentUpdatedParams> | EventTypeOpts<ReportToolCreatedParams> | EventTypeOpts<ReportSkillCreatedParams> | EventTypeOpts<ReportSkillUpdatedParams> | EventTypeOpts<ReportSkillDeletedParams> | EventTypeOpts<ReportRoundCompleteParams> | EventTypeOpts<ReportRoundErrorParams> | EventTypeOpts<ReportToolCallSuccessParams> | EventTypeOpts<ReportToolCallErrorParams>;
export type AgentBuilderEventTypes = typeof AGENT_BUILDER_EVENT_TYPES.OptInAction | typeof AGENT_BUILDER_EVENT_TYPES.OptOut | typeof AGENT_BUILDER_EVENT_TYPES.AddToChatClicked | typeof AGENT_BUILDER_EVENT_TYPES.AgentCreated | typeof AGENT_BUILDER_EVENT_TYPES.AgentUpdated | typeof AGENT_BUILDER_EVENT_TYPES.ToolCreated | typeof AGENT_BUILDER_EVENT_TYPES.SkillCreated | typeof AGENT_BUILDER_EVENT_TYPES.SkillUpdated | typeof AGENT_BUILDER_EVENT_TYPES.SkillDeleted | typeof AGENT_BUILDER_EVENT_TYPES.RoundComplete | typeof AGENT_BUILDER_EVENT_TYPES.RoundError | typeof AGENT_BUILDER_EVENT_TYPES.ToolCallSuccess | typeof AGENT_BUILDER_EVENT_TYPES.ToolCallError;
export declare const agentBuilderPublicEbtEvents: Array<EventTypeOpts<Record<string, unknown>>>;
export declare const agentBuilderServerEbtEvents: Array<EventTypeOpts<Record<string, unknown>>>;
