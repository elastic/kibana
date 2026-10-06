/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderEvent } from '../base/events';
import type {
  AttachmentTimelineEvent,
  ExecutionAbortedEvent,
  ExecutionFailedEvent,
  ExecutionPartialRunSummary,
  ExecutionStartedEvent,
  ExecutionTerminatedEvent,
} from './timeline_events';
import type { ExecutionAbortReason, SerializedExecutionError } from '../agents/execution_status';
import type { ToolOrigin, ToolType } from '../tools/definition';
import type { ToolResult } from '../tools/tool_result';
import type {
  CompactionSummary,
  ConversationInternalState,
  ConversationRound,
  ConversationRoundAuthor,
  ConversationRoundOrigin,
  ConversationRoundStep,
  RoundInput,
  BackgroundExecutionState,
  SubagentRosterEntry,
  SubstitutionStepData,
  TodoItem,
} from './conversation';
import type {
  PromptRequestSource,
  PromptRequest,
  AskUserQuestionItem,
  AskUserQuestionAnswer,
} from '../agents/prompts';
import type { VersionedAttachment } from '../attachments';
import type { ConversationAccessControl } from './access_control';
import type { UserIdAndName } from '../base/users';
export declare enum ChatEventType {
  toolCall = 'tool_call',
  browserToolCall = 'browser_tool_call',
  toolProgress = 'tool_progress',
  toolUi = 'tool_ui',
  toolResult = 'tool_result',
  reasoning = 'reasoning',
  messageChunk = 'message_chunk',
  messageComplete = 'message_complete',
  thinkingComplete = 'thinking_complete',
  promptRequest = 'prompt_request',
  roundStarted = 'round_started',
  roundComplete = 'round_complete',
  roundInterrupted = 'round_interrupted',
  conversationCreated = 'conversation_created',
  conversationUpdated = 'conversation_updated',
  conversationIdSet = 'conversation_id_set',
  compactionStarted = 'compaction_started',
  compactionCompleted = 'compaction_completed',
  backgroundAgentComplete = 'background_agent_complete',
  subagentRosterUpdated = 'subagent_roster_updated',
  userQuestionAsked = 'user_question_asked',
  userQuestionAnswered = 'user_question_answered',
  substitutionApplied = 'substitution_applied',
}
export type ChatEventBase<
  TEventType extends ChatEventType,
  TData extends Record<string, any>
> = AgentBuilderEvent<TEventType, TData>;
export interface ToolCallEventData {
  tool_call_id: string;
  tool_id: string;
  params: Record<string, unknown>;
  tool_call_group_id?: string;
  tool_origin?: ToolOrigin;
  tool_type?: ToolType;
}
export type ToolCallEvent = ChatEventBase<ChatEventType.toolCall, ToolCallEventData>;
export declare const isToolCallEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ToolCallEvent;
export interface BrowserToolCallEventData {
  tool_call_id: string;
  tool_id: string;
  params: Record<string, unknown>;
}
export type BrowserToolCallEvent = ChatEventBase<
  ChatEventType.browserToolCall,
  BrowserToolCallEventData
>;
export declare const isBrowserToolCallEvent: (
  event: AgentBuilderEvent<string, any>
) => event is BrowserToolCallEvent;
export interface ToolProgressEventData {
  tool_call_id: string;
  message: string;
  metadata?: Record<string, string>;
}
export type ToolProgressEvent = ChatEventBase<ChatEventType.toolProgress, ToolProgressEventData>;
export declare const isToolProgressEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ToolProgressEvent;
export interface ToolUiEventData<TEvent = string, TData extends object = object> {
  tool_id: string;
  tool_call_id: string;
  custom_event: TEvent;
  data: TData;
}
export type ToolUiEvent<
  TEvent extends string = string,
  TData extends object = object
> = ChatEventBase<ChatEventType.toolUi, ToolUiEventData<TEvent, TData>>;
export declare const isToolUiEvent: <TEvent extends string = string, TData extends object = object>(
  event: AgentBuilderEvent<string, any>,
  customType?: TEvent
) => event is ToolUiEvent<TEvent, TData>;
export interface ToolResultEventData {
  tool_call_id: string;
  tool_id: string;
  results: ToolResult[];
}
export type ToolResultEvent = ChatEventBase<ChatEventType.toolResult, ToolResultEventData>;
export declare const isToolResultEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ToolResultEvent;
export interface PromptRequestEventData {
  prompt: PromptRequest;
  source: PromptRequestSource;
}
export type PromptRequestEvent = ChatEventBase<ChatEventType.promptRequest, PromptRequestEventData>;
export declare const isPromptRequestEvent: (
  event: AgentBuilderEvent<string, any>
) => event is PromptRequestEvent;
export interface UserQuestionAskedEventData {
  prompt_id: string;
  questions: AskUserQuestionItem[];
}
export type UserQuestionAskedEvent = ChatEventBase<
  ChatEventType.userQuestionAsked,
  UserQuestionAskedEventData
>;
export declare const isUserQuestionAskedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is UserQuestionAskedEvent;
export declare const createUserQuestionAskedEvent: (
  data: UserQuestionAskedEventData
) => UserQuestionAskedEvent;
export interface UserQuestionAnsweredEventData {
  prompt_id: string;
  answers: AskUserQuestionAnswer[];
}
export type UserQuestionAnsweredEvent = ChatEventBase<
  ChatEventType.userQuestionAnswered,
  UserQuestionAnsweredEventData
>;
export declare const isUserQuestionAnsweredEvent: (
  event: AgentBuilderEvent<string, any>
) => event is UserQuestionAnsweredEvent;
export declare const createUserQuestionAnsweredEvent: (
  data: UserQuestionAnsweredEventData
) => UserQuestionAnsweredEvent;
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
export declare const isReasoningEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ReasoningEvent;
export interface MessageChunkEventData {
  /** ID of the message this chunk is bound to */
  message_id: string;
  /** chunk (text delta) */
  text_chunk: string;
}
export type MessageChunkEvent = ChatEventBase<ChatEventType.messageChunk, MessageChunkEventData>;
export declare const isMessageChunkEvent: (
  event: AgentBuilderEvent<string, any>
) => event is MessageChunkEvent;
export interface MessageCompleteEventData {
  /** ID of the message */
  message_id: string;
  /** full text content of the message */
  message_content: string;
  /** optional structured data */
  structured_output?: object;
}
export type MessageCompleteEvent = ChatEventBase<
  ChatEventType.messageComplete,
  MessageCompleteEventData
>;
export declare const isMessageCompleteEvent: (
  event: AgentBuilderEvent<string, any>
) => event is MessageCompleteEvent;
export interface ThinkingCompleteEventData {
  /** time elapsed from round start to first token arrival, in ms */
  time_to_first_token: number;
}
export type ThinkingCompleteEvent = ChatEventBase<
  ChatEventType.thinkingComplete,
  ThinkingCompleteEventData
>;
export declare const isThinkingCompleteEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ThinkingCompleteEvent;
export interface RoundStartedEventData {
  /** id of the round that started; matches the eventual `round_complete` round id */
  round_id: string;
  /** the processed input driving the round (what the round's `input` will be) */
  input: RoundInput;
  /** ISO timestamp the round started at (the round's `started_at`) */
  started_at: string;
  /** author of the round, when known */
  author?: ConversationRoundAuthor;
  /** origin of the round, for externally-originated rounds */
  origin?: ConversationRoundOrigin;
  /** true when this round resumed a paused (HITL) round */
  resumed?: boolean;
}
export type RoundStartedEvent = ChatEventBase<ChatEventType.roundStarted, RoundStartedEventData>;
export declare const isRoundStartedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is RoundStartedEvent;
export interface RoundCompleteEventData {
  /** round that was completed */
  round: ConversationRound;
  /** if true, it means the round was resumed, so we need to replace the last one instead of adding a new one */
  resumed?: boolean;
  /**
   * Present only on a resumed round. Carries the resume execution (`exec_k`) as its own round so the
   * persistence layer can append it to the timeline append-only, without rewriting the pause.
   */
  resume_execution?: {
    follow_up_round: ConversationRound;
  };
  /** if the prompt state was updated during the round, contains the up-to-date version */
  conversation_state?: ConversationInternalState;
  /**
   * Updated conversation-level attachments after this round.
   **/
  attachments?: VersionedAttachment[];
  /**
   * Attachment lifecycle events produced by this round: `chat_input` changes (attachments sent with
   * the message) and `execution` changes (made by tools). Persisted alongside the round's events.
   */
  attachment_events?: AttachmentTimelineEvent[];
  /**
   * Set when this round initialized the bash/VFS workspace for this conversation.
   */
  workspace_id?: string;
}
export type RoundCompleteEvent = ChatEventBase<ChatEventType.roundComplete, RoundCompleteEventData>;
export declare const isRoundCompleteEvent: (
  event: AgentBuilderEvent<string, any>
) => event is RoundCompleteEvent;
/** The two ways an execution can end without an outcome. */
export type ExecutionInterruptionType = 'failed' | 'aborted';
/** The run errored; `error` is exactly what the client received. */
export interface ExecutionFailedInterruption {
  type: 'failed';
  error: SerializedExecutionError;
}
/** The run was cancelled; `aborted_by` tells where the abort came from, when known. */
export interface ExecutionAbortedInterruption {
  type: 'aborted';
  aborted_by?: ExecutionAbortReason;
}
/** How an execution was interrupted. */
export type ExecutionInterruption = ExecutionFailedInterruption | ExecutionAbortedInterruption;
/**
 * Emitted by the agent handler when the run errors (or is cancelled) after it started: what is
 * known about the partial run, so the runner can persist it as a failed / aborted execution.
 * Internal plumbing — stripped from consumer-facing streams like `round_started`.
 */
export interface RoundInterruptedEventData {
  /** The runner's round id (the persisted id differs for a HITL resume). */
  round_id: string;
  started_at: string;
  /**
   * The processed round input, as the success path stores it on the round: inline attachments
   * replaced by refs, refs accessed during the run merged in, `attachment_context` rendered.
   */
  input: RoundInput;
  /** Steps completed before the interruption, in order. */
  steps: ConversationRoundStep[];
  summary: ExecutionPartialRunSummary;
  /** Full attachment state at interruption time, same source as `RoundCompleteEventData.attachments`. */
  attachments: VersionedAttachment[];
  /** `chat_input` and `execution` attachment changes, built as for `round_complete`. */
  attachment_events?: AttachmentTimelineEvent[];
  workspace_id?: string;
  /** True when the interrupted run was a HITL resume of a paused round. */
  resumed?: boolean;
  /** Compaction summary at interruption time, when the run compacted its context. */
  compaction_summary?: CompactionSummary;
}
export type RoundInterruptedEvent = ChatEventBase<
  ChatEventType.roundInterrupted,
  RoundInterruptedEventData
>;
export declare const isRoundInterruptedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is RoundInterruptedEvent;
export interface ConversationCreatedEventData {
  conversation_id: string;
  title: string;
  access_control: ConversationAccessControl;
  user: UserIdAndName;
}
export type ConversationCreatedEvent = ChatEventBase<
  ChatEventType.conversationCreated,
  ConversationCreatedEventData
>;
export declare const isConversationCreatedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ConversationCreatedEvent;
export interface ConversationUpdatedEventData {
  conversation_id: string;
  title: string;
  access_control: ConversationAccessControl;
}
export type ConversationUpdatedEvent = ChatEventBase<
  ChatEventType.conversationUpdated,
  ConversationUpdatedEventData
>;
export declare const isConversationUpdatedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ConversationUpdatedEvent;
export interface ConversationIdSetEventData {
  conversation_id: string;
}
export type ConversationIdSetEvent = ChatEventBase<
  ChatEventType.conversationIdSet,
  ConversationIdSetEventData
>;
export declare const isConversationIdSetEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ConversationIdSetEvent;
export interface CompactionStartedEventData {
  /** Estimated token count before compaction */
  token_count_before: number;
}
export type CompactionStartedEvent = ChatEventBase<
  ChatEventType.compactionStarted,
  CompactionStartedEventData
>;
export declare const isCompactionStartedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is CompactionStartedEvent;
export interface CompactionCompletedEventData {
  /** Estimated token count before compaction */
  token_count_before: number;
  /** Estimated token count after compaction */
  token_count_after: number;
  /** Number of cycles that were summarized */
  summarized_cycle_count: number;
}
export type CompactionCompletedEvent = ChatEventBase<
  ChatEventType.compactionCompleted,
  CompactionCompletedEventData
>;
export declare const isCompactionCompletedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is CompactionCompletedEvent;
export interface BackgroundAgentCompleteEventData {
  execution: BackgroundExecutionState;
}
export type BackgroundAgentCompleteEvent = ChatEventBase<
  ChatEventType.backgroundAgentComplete,
  BackgroundAgentCompleteEventData
>;
export declare const isBackgroundAgentCompleteEvent: (
  event: AgentBuilderEvent<string, any>
) => event is BackgroundAgentCompleteEvent;
export interface SubagentRosterUpdatedEventData {
  /** Full active roster at time of emission. */
  roster: SubagentRosterEntry[];
}
export type SubagentRosterUpdatedEvent = ChatEventBase<
  ChatEventType.subagentRosterUpdated,
  SubagentRosterUpdatedEventData
>;
export declare const createSubagentRosterUpdatedEvent: (
  roster: SubagentRosterEntry[]
) => SubagentRosterUpdatedEvent;
export declare const isSubagentRosterUpdatedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is SubagentRosterUpdatedEvent;
export type SubstitutionAppliedEventData = SubstitutionStepData;
export type SubstitutionAppliedEvent = ChatEventBase<
  ChatEventType.substitutionApplied,
  SubstitutionAppliedEventData
>;
export declare const createSubstitutionAppliedEvent: (
  data: SubstitutionAppliedEventData
) => SubstitutionAppliedEvent;
export declare const isSubstitutionAppliedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is SubstitutionAppliedEvent;
export declare const TODOS_UPDATED_UI_EVENT: 'todos_updated';
export interface TodosUpdatedUiEventData {
  todos: TodoItem[];
}
export declare const isTodosUpdatedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ToolUiEvent<'todos_updated', TodosUpdatedUiEventData>;
/**
 * All types of events that can be emitted from an agent execution.
 */
export type ChatAgentEvent =
  | ToolCallEvent
  | BrowserToolCallEvent
  | ToolProgressEvent
  | ToolUiEvent
  | ToolResultEvent
  | PromptRequestEvent
  | ReasoningEvent
  | MessageChunkEvent
  | MessageCompleteEvent
  | ThinkingCompleteEvent
  | RoundStartedEvent
  | RoundCompleteEvent
  | RoundInterruptedEvent
  | CompactionStartedEvent
  | CompactionCompletedEvent
  | BackgroundAgentCompleteEvent
  | SubagentRosterUpdatedEvent
  | SubstitutionAppliedEvent
  | UserQuestionAskedEvent
  | UserQuestionAnsweredEvent;
export declare const isExecutionStartedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ExecutionStartedEvent;
export declare const isExecutionTerminatedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ExecutionTerminatedEvent;
export declare const isExecutionFailedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ExecutionFailedEvent;
export declare const isExecutionAbortedEvent: (
  event: AgentBuilderEvent<string, any>
) => event is ExecutionAbortedEvent;
/**
 * All types of events that can be emitted from the chat API.
 */
export type ChatEvent =
  | ChatAgentEvent
  | ConversationCreatedEvent
  | ConversationUpdatedEvent
  | ConversationIdSetEvent
  | ExecutionStartedEvent
  | ExecutionTerminatedEvent
  | ExecutionFailedEvent
  | ExecutionAbortedEvent;
