/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserIdAndName } from '../base/users';
import type { ToolResult } from '../tools/tool_result';
import type {
  Attachment,
  VersionedAttachment,
  AttachmentInput,
  AttachmentVersionRef,
} from '../attachments';
import type { PromptRequest, PromptResponse, PromptStorageState } from '../agents/prompts';
import type { RuntimeAgentConfigurationOverrides } from '../agents/definition';
import type { RoundState } from './round_state';
import type { ConversationMetadataFields } from './conversation_metadata';
import type { ConversationCollaborationFields } from './collaboration';

/**
 * Represents the input that initiated a conversation round.
 */
export interface RoundInput {
  /**
   * A text message from the user.
   */
  message: string;
  /**
   * Optional attachments to provide to the agent.
   * @deprecated Use attachment_refs with conversation-level attachments instead
   */
  attachments?: Attachment[];
  /**
   * References to versioned conversation-level attachments.
   */
  attachment_refs?: AttachmentVersionRef[];
}

/**
 * Represents the input used to interact with an agent (new round, resume round)
 */
export interface ConverseInput {
  /**
   * A text message from the user.
   */
  message?: string;
  /**
   * Optional attachments to provide to the agent.
   * Use `origin` without `data` for by-reference types that implement `resolve`.
   * @deprecated Use attachment_refs with conversation-level attachments instead
   */
  attachments?: AttachmentInput[];
  /**
   * References to versioned conversation-level attachments.
   */
  attachment_refs?: AttachmentVersionRef[];
  /**
   * Response from the user to prompt requests.
   */
  prompts?: Record<string, PromptResponse>;
}

/**
 * Represents the final answer from the agent in a conversation round.
 */
export interface AssistantResponse {
  /**
   * The text message from the assistant.
   */
  message: string;
  structured_output?: object;
}

export enum ConversationRoundStepType {
  toolCall = 'tool_call',
  reasoning = 'reasoning',
  compaction = 'compaction',
}

// tool call step

export type ConversationRoundStepMixin<TType extends ConversationRoundStepType, TData> = TData & {
  type: TType;
};

/**
 * Tool call progress which were emitted during the tool execution
 */
export interface ToolCallProgress {
  /**
   * The full text message
   */
  message: string;
}

/**
 * Represents a tool call with the corresponding result.
 */
export interface ToolCallWithResult {
  /**
   * Id of the tool call, as returned by the LLM
   */
  tool_call_id: string;
  /**
   * Identifier of the tool.
   */
  tool_id: string;
  /**
   * Arguments the tool was called with.
   */
  params: Record<string, any>;
  /**
   * List of progress message which were send during that tool call
   */
  progression?: ToolCallProgress[];
  /**
   * Result of the tool
   */
  results: ToolResult[];
  /**
   * Optional group ID shared by tool calls that were executed in parallel from the same LLM response
   */
  tool_call_group_id?: string;
}

export type ToolCallStep = ConversationRoundStepMixin<
  ConversationRoundStepType.toolCall,
  ToolCallWithResult
>;

export const createToolCallStep = (toolCallWithResult: ToolCallWithResult): ToolCallStep => {
  return {
    type: ConversationRoundStepType.toolCall,
    ...toolCallWithResult,
  };
};

export const isToolCallStep = (step: ConversationRoundStep): step is ToolCallStep => {
  return step.type === ConversationRoundStepType.toolCall;
};

export const createReasoningStep = (reasoningStepWithResult: ReasoningStepData): ReasoningStep => {
  return {
    type: ConversationRoundStepType.reasoning,
    ...reasoningStepWithResult,
  };
};

export interface ReasoningStepData {
  /** plain text reasoning content */
  reasoning: string;
  /** if true, will not be displayed in the thinking panel, only used as "current thinking" **/
  transient?: boolean;
  /** when reasoning is bound to a tool call, the corresponding tool call ID */
  tool_call_id?: string;
  /** when reasoning is bound to a tool call group, the corresponding tool call group ID */
  tool_call_group_id?: string;
}

export type ReasoningStep = ConversationRoundStepMixin<
  ConversationRoundStepType.reasoning,
  ReasoningStepData
>;

export const isReasoningStep = (step: ConversationRoundStep): step is ReasoningStep => {
  return step.type === ConversationRoundStepType.reasoning;
};

/**
 * Defines all possible types for round steps.
 */
// compaction step

export interface CompactionStepData {
  /** Number of conversation rounds that were summarized into a compact form */
  summarized_round_count: number;
  /** Estimated token count of the conversation before compaction */
  token_count_before: number;
  /** Estimated token count of the conversation after compaction */
  token_count_after: number;
}

export type CompactionStep = ConversationRoundStepMixin<
  ConversationRoundStepType.compaction,
  CompactionStepData
>;

export const isCompactionStep = (step: ConversationRoundStep): step is CompactionStep => {
  return step.type === ConversationRoundStepType.compaction;
};

export type ConversationRoundStep = ToolCallStep | ReasoningStep | CompactionStep;

export enum ConversationRoundStatus {
  /** round is currently being processed */
  inProgress = 'in_progress',
  /** the round is completed */
  completed = 'completed',
  /** round has been interrupted and is awaiting user input */
  awaitingPrompt = 'awaiting_prompt',
}

/**
 * Represents a round in a conversation, containing all the information
 * related to this particular round.
 */
/**
 * Common fields shared between ConversationRound and AgentExecutionEvent.
 */
export interface AgentExecution {
  /** Current status of the execution */
  status: ConversationRoundStatus;
  /** Persisted state to resume interrupted states */
  state?: RoundState;
  /** If status is awaiting_prompt, contains the current prompt requests */
  pending_prompts?: PromptRequest[];
  /** List of intermediate steps (tool calls, reasoning, compaction) */
  steps: ConversationRoundStep[];
  /** The final response from the assistant */
  response: AssistantResponse;
  /** When the execution was started */
  started_at: string;
  /** Time it took to first token, in ms */
  time_to_first_token: number;
  /** Time it took to last token, in ms */
  time_to_last_token: number;
  /** Model usage statistics */
  model_usage: RoundModelUsageStats;
  /** When tracing is enabled, contains the traceId */
  trace_id?: string | string[];
  /** Runtime configuration overrides applied to this execution */
  configuration_overrides?: RuntimeAgentConfigurationOverrides;
}

export interface ConversationRound extends AgentExecution {
  /** unique id for this round */
  id: string;
  /** The user input that initiated the round */
  input: RoundInput;
}

export interface RoundModelUsageStats {
  /**
   * Id of the connector used for this round
   */
  connector_id: string;
  /**
   * Number of LLM calls which were done during this round.
   */
  llm_calls: number;
  /**
   * Total number of input tokens sent this round.
   */
  input_tokens: number;
  /**
   * Total number of output tokens received this round.
   */
  output_tokens: number;
  /**
   * Model identifier from the provider response, if available.
   */
  model?: string;
}

/**
 * Main structure representing a conversation with an agent.
 */
export interface Conversation extends ConversationMetadataFields, ConversationCollaborationFields {
  /** unique id for this conversation */
  id: string;
  /** id of the agent this conversation is bound to */
  agent_id: string;
  /** info of the owner of the discussion */
  user: UserIdAndName;
  /** title of the conversation */
  title: string;
  /** creation date */
  created_at: string;
  /** update date */
  updated_at: string;
  /** list of round for this conversation */
  rounds: ConversationRound[];
  /**
   * Conversation-level versioned attachments.
   * These attachments are shared across all rounds and can be referenced via attachment_refs.
   */
  attachments?: VersionedAttachment[];
  /**
   * Internal representation of the prompt storage state for the conversation.
   * Keeps track of which prompts have been answered and the response.
   */
  state?: ConversationInternalState;
}

/**
 * Internal storage for the conversation's arbitrary state.
 * Used for example to keep track of the prompt responses.
 */
export interface ConversationInternalState {
  prompt?: PromptStorageState;
  /**
   * Dynamic tool IDs that were added during conversation rounds.
   * These tools are persisted across rounds so they remain available.
   */
  dynamic_tool_ids?: string[];
  /**
   * Summary of compacted older conversation rounds.
   * Generated when the conversation approaches the model's context window limit.
   * Reused across rounds until regeneration is needed.
   */
  compaction_summary?: CompactionSummary;
}

export type ConversationWithoutRounds = Omit<Conversation, 'rounds'>;

export type ConversationAction = 'regenerate';

// ---------------------------------------------------------------------------
// Timeline data model
// ---------------------------------------------------------------------------

/**
 * All possible timeline event types.
 */
export enum TimelineEventType {
  user_message = 'user_message',
  agentExecution = 'agent_execution',
}

export type TimelineEventTypeValue = `${TimelineEventType}`;

/**
 * Base shape shared by all timeline events.
 */
export interface BaseTimelineEvent<
  EventType extends TimelineEventTypeValue = TimelineEventTypeValue
> {
  /** Server-generated UUID */
  id: string;
  /** ISO8601 timestamp, used for ordering and catch-up */
  timestamp: string;
  /** Discriminant for the event type */
  type: EventType;
}

/**
 * A user message appended to the timeline.
 */
export interface UserMessageEvent extends BaseTimelineEvent<'user_message'> {
  /** The user who sent the message */
  user: UserIdAndName;
  /** Text content of the message */
  message: string;
  /** @deprecated Use attachment_refs with conversation-level attachments instead */
  attachments?: Attachment[];
  /** References to versioned conversation-level attachments */
  attachment_refs?: AttachmentVersionRef[];
}

/**
 * An agent execution event appended to the timeline.
 * Contains the same data as a ConversationRound except for the `input` field.
 */
export interface AgentExecutionEvent extends BaseTimelineEvent<'agent_execution'>, AgentExecution {
  /** Id of the agent that produced this response */
  agent_id: string;
}

/**
 * Union of all timeline event types.
 */
export type TimelineEvent = UserMessageEvent | AgentExecutionEvent;

/**
 * Type guard: is this event a UserMessageEvent?
 */
export const isUserMessageEvent = (event: TimelineEvent): event is UserMessageEvent => {
  return event.type === TimelineEventType.user_message;
};

/**
 * Type guard: is this event an AgentExecutionEvent?
 */
export const isAgentExecutionEvent = (event: TimelineEvent): event is AgentExecutionEvent => {
  return event.type === TimelineEventType.agentExecution;
};

/**
 * Returns the last AgentExecutionEvent from a list of timeline events, or undefined.
 */
export const getLastExecutionEvent = (events: TimelineEvent[]): AgentExecutionEvent | undefined => {
  for (let i = events.length - 1; i >= 0; i--) {
    if (isAgentExecutionEvent(events[i])) {
      return events[i] as AgentExecutionEvent;
    }
  }
  return undefined;
};

/**
 * Event-stream conversation format for agent execution.
 * Same `events` field as persisted on {@link Conversation}; omits legacy `rounds`.
 */
export type TimelineConversation = Omit<Conversation, 'rounds' | 'events'> & {
  /** Ordered chat events — canonical for execution and persistence */
  events: TimelineEvent[];
};

export const isTimelineConversation = (
  conversation: Conversation | TimelineConversation
): conversation is TimelineConversation => {
  return !('rounds' in conversation);
};
// Compaction summary types

/** Compact representation of a tool call in a compaction summary */
export interface CompactionToolCallSummary {
  tool_id: string;
  /** Short stringified summary of the params the tool was called with */
  params_summary: string;
}

/** Structured entity extracted during compaction */
export interface CompactionEntity {
  type: string;
  name: string;
}

/**
 * Structured data produced by the compaction pipeline.
 * Semantic fields (discussion_summary, user_intent, key_topics,
 * outcomes_and_decisions, unanswered_questions, entities) are LLM-generated.
 * Deterministic fields (tool_calls_summary, agent_actions)
 * are extracted programmatically from the round data.
 */
export interface CompactionStructuredData {
  discussion_summary: string;
  user_intent: string;
  key_topics: string[];
  outcomes_and_decisions: string[];
  agent_actions: string[];
  entities: CompactionEntity[];
  unanswered_questions: string[];
  tool_calls_summary: CompactionToolCallSummary[];
}

/**
 * Summary of compacted conversation rounds.
 * Stored at the conversation level and reused across rounds
 * until the context window fills up again and regeneration is needed.
 */
export interface CompactionSummary {
  /** Number of rounds that were summarized */
  summarized_round_count: number;
  /** When the summary was generated */
  created_at: string;
  /** Estimated token count of the serialized summary */
  token_count: number;
  /** Structured summary data */
  structured_data: CompactionStructuredData;
}
