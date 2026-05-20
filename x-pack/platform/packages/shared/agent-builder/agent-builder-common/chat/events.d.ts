import type { AgentBuilderEvent } from '../base/events';
import type { ToolOrigin } from '../tools/definition';
import type { ToolResult } from '../tools/tool_result';
import type { ConversationInternalState, ConversationRound, BackgroundExecutionState, TodoItem } from './conversation';
import type { PromptRequestSource, PromptRequest } from '../agents/prompts';
import type { VersionedAttachment } from '../attachments';
export declare enum ChatEventType {
    toolCall = "tool_call",
    browserToolCall = "browser_tool_call",
    toolProgress = "tool_progress",
    toolUi = "tool_ui",
    toolResult = "tool_result",
    reasoning = "reasoning",
    messageChunk = "message_chunk",
    messageComplete = "message_complete",
    thinkingComplete = "thinking_complete",
    promptRequest = "prompt_request",
    roundComplete = "round_complete",
    conversationCreated = "conversation_created",
    conversationUpdated = "conversation_updated",
    conversationIdSet = "conversation_id_set",
    compactionStarted = "compaction_started",
    compactionCompleted = "compaction_completed",
    backgroundAgentComplete = "background_agent_complete"
}
export type ChatEventBase<TEventType extends ChatEventType, TData extends Record<string, any>> = AgentBuilderEvent<TEventType, TData>;
export interface ToolCallEventData {
    tool_call_id: string;
    tool_id: string;
    params: Record<string, unknown>;
    tool_call_group_id?: string;
    tool_origin?: ToolOrigin;
}
export type ToolCallEvent = ChatEventBase<ChatEventType.toolCall, ToolCallEventData>;
export declare const isToolCallEvent: (event: AgentBuilderEvent<string, any>) => event is ToolCallEvent;
export interface BrowserToolCallEventData {
    tool_call_id: string;
    tool_id: string;
    params: Record<string, unknown>;
}
export type BrowserToolCallEvent = ChatEventBase<ChatEventType.browserToolCall, BrowserToolCallEventData>;
export declare const isBrowserToolCallEvent: (event: AgentBuilderEvent<string, any>) => event is BrowserToolCallEvent;
export interface ToolProgressEventData {
    tool_call_id: string;
    message: string;
    metadata?: Record<string, string>;
}
export type ToolProgressEvent = ChatEventBase<ChatEventType.toolProgress, ToolProgressEventData>;
export declare const isToolProgressEvent: (event: AgentBuilderEvent<string, any>) => event is ToolProgressEvent;
export interface ToolUiEventData<TEvent = string, TData extends object = object> {
    tool_id: string;
    tool_call_id: string;
    custom_event: TEvent;
    data: TData;
}
export type ToolUiEvent<TEvent extends string = string, TData extends object = object> = ChatEventBase<ChatEventType.toolUi, ToolUiEventData<TEvent, TData>>;
export declare const isToolUiEvent: <TEvent extends string = string, TData extends object = object>(event: AgentBuilderEvent<string, any>, customType?: TEvent) => event is ToolUiEvent<TEvent, TData>;
export interface ToolResultEventData {
    tool_call_id: string;
    tool_id: string;
    results: ToolResult[];
}
export type ToolResultEvent = ChatEventBase<ChatEventType.toolResult, ToolResultEventData>;
export declare const isToolResultEvent: (event: AgentBuilderEvent<string, any>) => event is ToolResultEvent;
export interface PromptRequestEventData {
    prompt: PromptRequest;
    source: PromptRequestSource;
}
export type PromptRequestEvent = ChatEventBase<ChatEventType.promptRequest, PromptRequestEventData>;
export declare const isPromptRequestEvent: (event: AgentBuilderEvent<string, any>) => event is PromptRequestEvent;
export interface ReasoningEventData {
    /** plain text reasoning content */
    reasoning: string;
    /** when reasoning is bound to a tool call, the corresponding tool call ID */
    tool_call_id?: string;
    /** when reasoning is bound to a tool call, the corresponding tool call group */
    tool_call_group_id?: string;
    /** if true, will not be persisted or displaying in the thinking panel, only displayed as "current thinking" **/
    transient?: boolean;
}
export type ReasoningEvent = ChatEventBase<ChatEventType.reasoning, ReasoningEventData>;
export declare const isReasoningEvent: (event: AgentBuilderEvent<string, any>) => event is ReasoningEvent;
export interface MessageChunkEventData {
    /** ID of the message this chunk is bound to */
    message_id: string;
    /** chunk (text delta) */
    text_chunk: string;
}
export type MessageChunkEvent = ChatEventBase<ChatEventType.messageChunk, MessageChunkEventData>;
export declare const isMessageChunkEvent: (event: AgentBuilderEvent<string, any>) => event is MessageChunkEvent;
export interface MessageCompleteEventData {
    /** ID of the message */
    message_id: string;
    /** full text content of the message */
    message_content: string;
    /** optional structured data */
    structured_output?: object;
}
export type MessageCompleteEvent = ChatEventBase<ChatEventType.messageComplete, MessageCompleteEventData>;
export declare const isMessageCompleteEvent: (event: AgentBuilderEvent<string, any>) => event is MessageCompleteEvent;
export interface ThinkingCompleteEventData {
    /** time elapsed from round start to first token arrival, in ms */
    time_to_first_token: number;
}
export type ThinkingCompleteEvent = ChatEventBase<ChatEventType.thinkingComplete, ThinkingCompleteEventData>;
export declare const isThinkingCompleteEvent: (event: AgentBuilderEvent<string, any>) => event is ThinkingCompleteEvent;
export interface RoundCompleteEventData {
    /** round that was completed */
    round: ConversationRound;
    /** if true, it means the round was resumed, so we need to replace the last one instead of adding a new one */
    resumed?: boolean;
    /** if the prompt state was updated during the round, contains the up-to-date version */
    conversation_state?: ConversationInternalState;
    /**
     * Updated conversation-level attachments after this round.
     **/
    attachments?: VersionedAttachment[];
}
export type RoundCompleteEvent = ChatEventBase<ChatEventType.roundComplete, RoundCompleteEventData>;
export declare const isRoundCompleteEvent: (event: AgentBuilderEvent<string, any>) => event is RoundCompleteEvent;
export interface ConversationCreatedEventData {
    conversation_id: string;
    title: string;
}
export type ConversationCreatedEvent = ChatEventBase<ChatEventType.conversationCreated, ConversationCreatedEventData>;
export declare const isConversationCreatedEvent: (event: AgentBuilderEvent<string, any>) => event is ConversationCreatedEvent;
export interface ConversationUpdatedEventData {
    conversation_id: string;
    title: string;
}
export type ConversationUpdatedEvent = ChatEventBase<ChatEventType.conversationUpdated, ConversationUpdatedEventData>;
export declare const isConversationUpdatedEvent: (event: AgentBuilderEvent<string, any>) => event is ConversationUpdatedEvent;
export interface ConversationIdSetEventData {
    conversation_id: string;
}
export type ConversationIdSetEvent = ChatEventBase<ChatEventType.conversationIdSet, ConversationIdSetEventData>;
export declare const isConversationIdSetEvent: (event: AgentBuilderEvent<string, any>) => event is ConversationIdSetEvent;
export interface CompactionStartedEventData {
    /** Estimated token count before compaction */
    token_count_before: number;
}
export type CompactionStartedEvent = ChatEventBase<ChatEventType.compactionStarted, CompactionStartedEventData>;
export declare const isCompactionStartedEvent: (event: AgentBuilderEvent<string, any>) => event is CompactionStartedEvent;
export interface CompactionCompletedEventData {
    /** Estimated token count after compaction */
    token_count_after: number;
    /** Number of rounds that were summarized */
    summarized_round_count: number;
}
export type CompactionCompletedEvent = ChatEventBase<ChatEventType.compactionCompleted, CompactionCompletedEventData>;
export declare const isCompactionCompletedEvent: (event: AgentBuilderEvent<string, any>) => event is CompactionCompletedEvent;
export interface BackgroundAgentCompleteEventData {
    execution: BackgroundExecutionState;
}
export type BackgroundAgentCompleteEvent = ChatEventBase<ChatEventType.backgroundAgentComplete, BackgroundAgentCompleteEventData>;
export declare const isBackgroundAgentCompleteEvent: (event: AgentBuilderEvent<string, any>) => event is BackgroundAgentCompleteEvent;
export declare const TODOS_UPDATED_UI_EVENT: "todos_updated";
export interface TodosUpdatedUiEventData {
    todos: TodoItem[];
}
export declare const isTodosUpdatedEvent: (event: AgentBuilderEvent<string, any>) => event is ToolUiEvent<"todos_updated", TodosUpdatedUiEventData>;
/**
 * All types of events that can be emitted from an agent execution.
 */
export type ChatAgentEvent = ToolCallEvent | BrowserToolCallEvent | ToolProgressEvent | ToolUiEvent | ToolResultEvent | PromptRequestEvent | ReasoningEvent | MessageChunkEvent | MessageCompleteEvent | ThinkingCompleteEvent | RoundCompleteEvent | CompactionStartedEvent | CompactionCompletedEvent | BackgroundAgentCompleteEvent;
/**
 * All types of events that can be emitted from the chat API.
 */
export type ChatEvent = ChatAgentEvent | ConversationCreatedEvent | ConversationUpdatedEvent | ConversationIdSetEvent;
