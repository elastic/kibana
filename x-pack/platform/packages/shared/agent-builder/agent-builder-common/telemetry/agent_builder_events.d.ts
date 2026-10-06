import type { EventTypeOpts } from '@kbn/core/public';
import type { ConversationOriginType } from '../chat/conversation';
export declare const AGENT_BUILDER_EVENT_TYPES: {
    readonly OptInAction: "agent_builder_opt_in_action";
    readonly OptOut: "agent_builder_opt_out";
    readonly UiClick: "agent_builder_ui_click";
    readonly AddToChatClicked: "agent_builder_add_to_chat_clicked";
    readonly ImageUploadRejected: "agent_builder_image_upload_rejected";
    readonly ImageUploadSucceeded: "agent_builder_image_upload_succeeded";
    readonly AgentCreated: "agent_builder_agent_created";
    readonly AgentUpdated: "agent_builder_agent_updated";
    readonly ToolCreated: "agent_builder_tool_created";
    readonly SkillCreated: "agent_builder_skill_created";
    readonly SkillUpdated: "agent_builder_skill_updated";
    readonly SkillDeleted: "agent_builder_skill_deleted";
    readonly SkillInvoked: "agent_builder_skill_invoked";
    readonly PluginImported: "agent_builder_plugin_imported";
    readonly RoundComplete: "agent_builder_round_complete";
    readonly ExecutionComplete: "agent_builder_execution_complete";
    readonly RoundError: "agent_builder_round_error";
    readonly ToolCallSuccess: "agent_builder_tool_call_success";
    readonly ToolCallError: "agent_builder_tool_call_error";
    readonly ManageEntityListView: "agent_builder_manage_entity_list_view";
    readonly UsedByWarningShown: "agent_builder_used_by_warning_shown";
    readonly UsedByWarningProceeded: "agent_builder_used_by_warning_proceeded";
    readonly InappChatOpen: "agent_builder_inapp_chat_open";
    readonly FullscreenEntryPoint: "agent_builder_fullscreen_entry_point";
    readonly HitlPromptShown: "agent_builder_hitl_prompt_shown";
    readonly HitlQuestionAnswered: "agent_builder_hitl_question_answered";
    readonly FeedbackSubmitted: "agent_builder_feedback_submitted";
    readonly FeedbackRetracted: "agent_builder_feedback_retracted";
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
    item_count?: number;
}
export interface ReportImageUploadRejectedParams {
    reason: 'too_large' | 'invalid_type' | 'too_many';
    mime_type?: string;
    file_size?: number;
}
export interface ReportImageUploadSucceededParams {
    mime_type: string;
    file_size: number;
}
export type AgentBuilderUiClickElementKind = 'button' | 'link' | 'role_button' | 'input_button' | 'other';
export interface ReportUiClickParams {
    ebt_element: string;
    ebt_action?: string;
    ebt_detail?: string;
    element_kind: AgentBuilderUiClickElementKind;
}
export type TelemetryConversationOrigin = `${ConversationOriginType}`;
export interface ReportRoundCompleteParams {
    agent_id: string;
    attachments?: string[];
    conversation_id?: string;
    execution_id?: string;
    origin?: TelemetryConversationOrigin;
    input_tokens: number;
    cached_input_tokens?: number;
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
/** How a human resolved a HITL prompt. */
export type PromptResponseOutcomeValue = 'accepted' | 'declined' | 'authorized' | 'authorization_declined' | 'answered' | 'skipped';
export interface ReportExecutionCompleteParams {
    agent_id: string;
    attachments?: string[];
    conversation_id?: string;
    execution_id?: string;
    round_id: string;
    round_number: number;
    execution_index: number;
    trigger: 'user_message' | 'prompt_response';
    outcome: 'responded' | 'prompt_requested';
    input_tokens: number;
    cached_input_tokens?: number;
    llm_calls: number;
    output_tokens: number;
    model?: string;
    model_provider?: string;
    started_at: string;
    time_to_first_token: number;
    time_to_last_token: number;
    tool_calls: number;
    tool_call_errors: number;
    tools_invoked: string[];
    message_length: number;
    response_length: number;
    prompt_count?: number;
    prompt_types?: string[];
    prompt_response_types?: string[];
    prompt_response_outcomes?: PromptResponseOutcomeValue[];
    human_latency_ms?: number;
}
export interface ReportRoundErrorParams {
    error_type: string;
    error_message: string;
    model_provider?: string;
    conversation_id?: string;
    execution_id?: string;
    origin?: TelemetryConversationOrigin;
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
export type SkillSolutionArea = 'security' | 'observability' | 'ml' | 'search' | 'platform' | 'custom' | 'plugin' | 'unknown';
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
    /** Deduplicated, normalized tool IDs included in the created skill. */
    tool_ids: string[];
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
    /** Deduplicated, normalized tool IDs included in the updated skill. */
    tool_ids: string[];
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
    origin?: TelemetryConversationOrigin;
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
    origin?: TelemetryConversationOrigin;
    model?: string;
    error_type: string;
    error_message: string;
    duration_ms: number;
}
export interface ReportManageEntityListViewParams {
    entity_type: string;
    entity_count: number;
}
export interface ReportUsedByWarningShownParams {
    entity_type: string;
    agent_count: number;
}
export interface ReportUsedByWarningProceededParams {
    entity_type: string;
    agent_count: number;
}
export interface ReportInappChatOpenParams {
    agent_id: string;
    kibana_app?: string;
    agent_count?: number;
}
export type FullscreenEntryPointSource = 'inapp_escalation' | 'direct' | 'bookmark' | 'redirect';
export interface ReportFullscreenEntryPointParams {
    agent_id: string;
    conversation_id: string;
    source: FullscreenEntryPointSource;
}
export interface ReportHitlPromptShownParams {
    prompt_id: string;
    total_questions: number;
    conversation_id?: string;
    agent_id?: string;
}
export type HitlQuestionAnsweredOutcome = 'answered' | 'skipped';
export interface ReportHitlQuestionAnsweredParams {
    prompt_id: string;
    conversation_id?: string;
    agent_id?: string;
    question_index: number;
    is_multi_select: boolean;
    outcome: HitlQuestionAnsweredOutcome;
    used_custom_text: boolean;
    selected_option_count: number;
}
export interface ReportFeedbackSubmittedParams {
    /** Round that received feedback */
    round_id: string;
    conversation_id?: string;
    /** up or down */
    vote: string;
    /** Predefined chip IDs selected by the user */
    chips: string[];
    /**
     * Free-text comment from the user. Only sent when non-empty.
     * The modal disclosure names Elastic as the recipient and links to the
     * Elastic Privacy Statement (https://www.elastic.co/legal/privacy-statement).
     */
    comment?: string;
    /** OTel trace ID of the round — correlates with traces-* and round_complete events */
    trace_id?: string;
    /** LLM connector used for this round */
    connector_id?: string;
    /** Model identifier */
    model?: string;
    /** Agent ID */
    agent_id?: string;
    /** Tool IDs called during the round */
    tool_names?: string[];
    /** Total input tokens used */
    input_tokens?: number;
    /** Total output tokens generated */
    output_tokens?: number;
    /** Number of LLM API calls made during the round */
    llm_calls?: number;
}
export interface ReportFeedbackRetractedParams {
    /** Round whose feedback was retracted */
    round_id: string;
    conversation_id?: string;
    /** OTel trace ID of the round */
    trace_id?: string;
    /** LLM connector used for this round */
    connector_id?: string;
    /** Model identifier */
    model?: string;
    /** Agent ID */
    agent_id?: string;
    /** Tool IDs called during the round */
    tool_names?: string[];
    /** Total input tokens used */
    input_tokens?: number;
    /** Total output tokens generated */
    output_tokens?: number;
    /** Number of LLM API calls made during the round */
    llm_calls?: number;
}
export interface AgentBuilderTelemetryEventsMap {
    [AGENT_BUILDER_EVENT_TYPES.OptInAction]: ReportOptInActionParams;
    [AGENT_BUILDER_EVENT_TYPES.OptOut]: ReportOptOutParams;
    [AGENT_BUILDER_EVENT_TYPES.UiClick]: ReportUiClickParams;
    [AGENT_BUILDER_EVENT_TYPES.AddToChatClicked]: ReportAddToChatClickedParams;
    [AGENT_BUILDER_EVENT_TYPES.ImageUploadRejected]: ReportImageUploadRejectedParams;
    [AGENT_BUILDER_EVENT_TYPES.ImageUploadSucceeded]: ReportImageUploadSucceededParams;
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
    [AGENT_BUILDER_EVENT_TYPES.ExecutionComplete]: ReportExecutionCompleteParams;
    [AGENT_BUILDER_EVENT_TYPES.RoundError]: ReportRoundErrorParams;
    [AGENT_BUILDER_EVENT_TYPES.ToolCallSuccess]: ReportToolCallSuccessParams;
    [AGENT_BUILDER_EVENT_TYPES.ToolCallError]: ReportToolCallErrorParams;
    [AGENT_BUILDER_EVENT_TYPES.ManageEntityListView]: ReportManageEntityListViewParams;
    [AGENT_BUILDER_EVENT_TYPES.UsedByWarningShown]: ReportUsedByWarningShownParams;
    [AGENT_BUILDER_EVENT_TYPES.UsedByWarningProceeded]: ReportUsedByWarningProceededParams;
    [AGENT_BUILDER_EVENT_TYPES.InappChatOpen]: ReportInappChatOpenParams;
    [AGENT_BUILDER_EVENT_TYPES.FullscreenEntryPoint]: ReportFullscreenEntryPointParams;
    [AGENT_BUILDER_EVENT_TYPES.HitlPromptShown]: ReportHitlPromptShownParams;
    [AGENT_BUILDER_EVENT_TYPES.HitlQuestionAnswered]: ReportHitlQuestionAnsweredParams;
    [AGENT_BUILDER_EVENT_TYPES.FeedbackSubmitted]: ReportFeedbackSubmittedParams;
    [AGENT_BUILDER_EVENT_TYPES.FeedbackRetracted]: ReportFeedbackRetractedParams;
}
export type AgentBuilderTelemetryEvent = EventTypeOpts<ReportOptInActionParams> | EventTypeOpts<ReportOptOutParams> | EventTypeOpts<ReportUiClickParams> | EventTypeOpts<ReportAddToChatClickedParams> | EventTypeOpts<ReportImageUploadRejectedParams> | EventTypeOpts<ReportImageUploadSucceededParams> | EventTypeOpts<ReportAgentCreatedParams> | EventTypeOpts<ReportAgentUpdatedParams> | EventTypeOpts<ReportToolCreatedParams> | EventTypeOpts<ReportSkillCreatedParams> | EventTypeOpts<ReportSkillUpdatedParams> | EventTypeOpts<ReportSkillDeletedParams> | EventTypeOpts<ReportSkillInvokedParams> | EventTypeOpts<ReportPluginImportedParams> | EventTypeOpts<ReportRoundCompleteParams> | EventTypeOpts<ReportExecutionCompleteParams> | EventTypeOpts<ReportRoundErrorParams> | EventTypeOpts<ReportToolCallSuccessParams> | EventTypeOpts<ReportToolCallErrorParams> | EventTypeOpts<ReportManageEntityListViewParams> | EventTypeOpts<ReportUsedByWarningShownParams> | EventTypeOpts<ReportUsedByWarningProceededParams> | EventTypeOpts<ReportInappChatOpenParams> | EventTypeOpts<ReportFullscreenEntryPointParams> | EventTypeOpts<ReportHitlPromptShownParams> | EventTypeOpts<ReportHitlQuestionAnsweredParams> | EventTypeOpts<ReportFeedbackSubmittedParams> | EventTypeOpts<ReportFeedbackRetractedParams>;
export type AgentBuilderEventTypes = typeof AGENT_BUILDER_EVENT_TYPES.OptInAction | typeof AGENT_BUILDER_EVENT_TYPES.OptOut | typeof AGENT_BUILDER_EVENT_TYPES.UiClick | typeof AGENT_BUILDER_EVENT_TYPES.AddToChatClicked | typeof AGENT_BUILDER_EVENT_TYPES.ImageUploadRejected | typeof AGENT_BUILDER_EVENT_TYPES.ImageUploadSucceeded | typeof AGENT_BUILDER_EVENT_TYPES.AgentCreated | typeof AGENT_BUILDER_EVENT_TYPES.AgentUpdated | typeof AGENT_BUILDER_EVENT_TYPES.ToolCreated | typeof AGENT_BUILDER_EVENT_TYPES.SkillCreated | typeof AGENT_BUILDER_EVENT_TYPES.SkillUpdated | typeof AGENT_BUILDER_EVENT_TYPES.SkillDeleted | typeof AGENT_BUILDER_EVENT_TYPES.SkillInvoked | typeof AGENT_BUILDER_EVENT_TYPES.PluginImported | typeof AGENT_BUILDER_EVENT_TYPES.RoundComplete | typeof AGENT_BUILDER_EVENT_TYPES.ExecutionComplete | typeof AGENT_BUILDER_EVENT_TYPES.RoundError | typeof AGENT_BUILDER_EVENT_TYPES.ToolCallSuccess | typeof AGENT_BUILDER_EVENT_TYPES.ToolCallError | typeof AGENT_BUILDER_EVENT_TYPES.ManageEntityListView | typeof AGENT_BUILDER_EVENT_TYPES.UsedByWarningShown | typeof AGENT_BUILDER_EVENT_TYPES.UsedByWarningProceeded | typeof AGENT_BUILDER_EVENT_TYPES.InappChatOpen | typeof AGENT_BUILDER_EVENT_TYPES.FullscreenEntryPoint | typeof AGENT_BUILDER_EVENT_TYPES.HitlPromptShown | typeof AGENT_BUILDER_EVENT_TYPES.HitlQuestionAnswered | typeof AGENT_BUILDER_EVENT_TYPES.FeedbackSubmitted | typeof AGENT_BUILDER_EVENT_TYPES.FeedbackRetracted;
export declare const agentBuilderPublicEbtEvents: Array<EventTypeOpts<Record<string, unknown>>>;
export declare const agentBuilderServerEbtEvents: Array<EventTypeOpts<Record<string, unknown>>>;
