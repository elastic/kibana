import type { AnalyticsServiceSetup, EventTypeOpts } from '@kbn/core/public';
export declare const AGENT_BUILDER_EVENT_TYPES: {
    readonly OptInStepReached: "Agent Builder Opt-In Step Reached";
    readonly OptInConfirmationShown: "Agent Builder Opt-In Confirmation Shown";
    readonly OptInConfirmed: "Agent Builder Opt-In Confirmed";
    readonly OptInCancelled: "Agent Builder Opt-In Cancelled";
    readonly OptOut: "Agent Builder Opt-Out";
    readonly AddToChatClicked: "Agent Builder Add to Chat Clicked";
    readonly MessageSent: "Agent Builder Message Sent";
    readonly MessageReceived: "Agent Builder Message Received";
    readonly AgentBuilderError: "Agent Builder Error";
};
export type OptInSource = 'security_settings_menu' | 'stack_management' | 'security_ab_tour';
export type OptInStep = 'initial' | 'confirmation_modal' | 'final';
export type AttachmentType = 'alert' | 'entity' | 'rule' | 'attack_discovery' | 'other';
export type Pathway = 'alerts_flyout' | 'entity_flyout' | 'rules_table' | 'rule_creation' | 'attack_discovery' | 'other';
export type ErrorContext = 'opt_in' | 'message_send' | 'tool_execution' | 'invocation' | 'other';
export interface ReportOptInStepReachedParams {
    step: OptInStep;
    source: OptInSource;
}
export interface ReportOptInConfirmationShownParams {
    source: OptInSource;
}
export interface ReportOptInConfirmedParams {
    source: OptInSource;
}
export interface ReportOptInCancelledParams {
    source: OptInSource;
    step: OptInStep;
}
export interface ReportOptOutParams {
    source: 'security_settings_menu' | 'stack_management';
}
export interface ReportAddToChatClickedParams {
    pathway: Pathway;
    attachmentType?: AttachmentType;
    attachmentCount?: number;
}
export interface ReportMessageSentParams {
    conversationId: string;
    messageLength?: number;
    hasAttachments: boolean;
    attachmentCount?: number;
    attachmentTypes?: string[];
    agentId?: string;
}
export interface ReportMessageReceivedParams {
    conversationId: string;
    responseLength?: number;
    roundNumber?: number;
    agentId?: string;
    toolsUsed?: string[];
    toolCount?: number;
    toolsInvoked?: string[];
}
export interface ReportAgentBuilderErrorParams {
    errorType: string;
    errorMessage?: string;
    context?: ErrorContext;
    conversationId?: string;
    agentId?: string;
    pathway?: string;
}
export interface AgentBuilderTelemetryEventsMap {
    [AGENT_BUILDER_EVENT_TYPES.OptInStepReached]: ReportOptInStepReachedParams;
    [AGENT_BUILDER_EVENT_TYPES.OptInConfirmationShown]: ReportOptInConfirmationShownParams;
    [AGENT_BUILDER_EVENT_TYPES.OptInConfirmed]: ReportOptInConfirmedParams;
    [AGENT_BUILDER_EVENT_TYPES.OptInCancelled]: ReportOptInCancelledParams;
    [AGENT_BUILDER_EVENT_TYPES.OptOut]: ReportOptOutParams;
    [AGENT_BUILDER_EVENT_TYPES.AddToChatClicked]: ReportAddToChatClickedParams;
    [AGENT_BUILDER_EVENT_TYPES.MessageSent]: ReportMessageSentParams;
    [AGENT_BUILDER_EVENT_TYPES.MessageReceived]: ReportMessageReceivedParams;
    [AGENT_BUILDER_EVENT_TYPES.AgentBuilderError]: ReportAgentBuilderErrorParams;
}
export type AgentBuilderTelemetryEvent = EventTypeOpts<ReportOptInStepReachedParams> | EventTypeOpts<ReportOptInConfirmationShownParams> | EventTypeOpts<ReportOptInConfirmedParams> | EventTypeOpts<ReportOptInCancelledParams> | EventTypeOpts<ReportOptOutParams> | EventTypeOpts<ReportAddToChatClickedParams> | EventTypeOpts<ReportMessageSentParams> | EventTypeOpts<ReportMessageReceivedParams> | EventTypeOpts<ReportAgentBuilderErrorParams>;
export type AgentBuilderEventTypes = typeof AGENT_BUILDER_EVENT_TYPES.OptInStepReached | typeof AGENT_BUILDER_EVENT_TYPES.OptInConfirmationShown | typeof AGENT_BUILDER_EVENT_TYPES.OptInConfirmed | typeof AGENT_BUILDER_EVENT_TYPES.OptInCancelled | typeof AGENT_BUILDER_EVENT_TYPES.OptOut | typeof AGENT_BUILDER_EVENT_TYPES.AddToChatClicked | typeof AGENT_BUILDER_EVENT_TYPES.MessageSent | typeof AGENT_BUILDER_EVENT_TYPES.MessageReceived | typeof AGENT_BUILDER_EVENT_TYPES.AgentBuilderError;
export declare const agentBuilderTelemetryEvents: Array<EventTypeOpts<Record<string, unknown>>>;
/**
 * Registers Agent Builder telemetry events with the analytics service.
 */
export declare const registerAgentBuilderTelemetryEvents: (analytics: AnalyticsServiceSetup) => void;
