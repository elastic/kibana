/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptRequest, PromptResponse } from '../agents/prompts';
import type { SerializedExecutionError } from '../agents/execution_status';
import type {
  AssistantResponse,
  ConversationRoundStep,
  ConversationRoundOrigin,
  RoundInput,
  RoundModelUsageStats,
} from './conversation';

/**
 * The current schema version for an events-native conversation document.
 *
 * A conversation document carries this value in its `schema_version` field when it is
 * stored as an event timeline (as opposed to the legacy `conversation_rounds` shape).
 * Readers use it to tell the two formats apart.
 */
export const CONVERSATION_SCHEMA_VERSION = 1;

/** The kind of participant that produced a timeline event. */
export enum EventActorType {
  /** An authenticated Kibana user. */
  user = 'user',
  /** An agent run. */
  agent = 'agent',
  /** An external system (e.g. Slack, GitHub). */
  external = 'external',
  /** Kibana itself (lifecycle/audit bookkeeping). */
  system = 'system',
}

/**
 * Records who produced a timeline event.
 */
export interface EventActor {
  /** The kind of participant. */
  type: EventActorType;
  /**
   * Stable participant identifier. For an `external` actor this is the external system's own
   * user id, stored raw (e.g. the Slack user id, not prefixed); `origin.type` says which system
   * it belongs to. The external thread/conversation id lives on the conversation, at
   * `conversation.origin.external_conversation_id`, not here.
   */
  id: string;
  /** Optional username / handle. */
  username?: string;
  /** Optional display name. */
  full_name?: string;
  /** For external actors, the origin the event came from (which system). */
  origin?: ConversationRoundOrigin;
}

/**
 * What caused an agent run to start.
 */
export enum TimelineTriggerType {
  /** A user message. */
  userMessage = 'user_message',
  /** A human answering a prompt (HITL resume). */
  promptResponse = 'prompt_response',
  /** A scheduled task, no user present. */
  schedule = 'schedule',
  /** An external system. */
  external = 'external',
  /** A user mentioning the agent (`@agent`) in a shared conversation. */
  agentMention = 'agent_mention',
}

/** The set of timeline event types supported in the MVP. */
export enum TimelineEventType {
  // Content
  userMessage = 'user_message',
  promptResponse = 'prompt_response',
  // Execution lifecycle
  executionStarted = 'execution_started',
  promptRequested = 'prompt_requested',
  executionCompleted = 'execution_completed',
  executionFailed = 'execution_failed',
  executionAborted = 'execution_aborted',
}

/**
 * The fields a producer supplies for a timeline event.
 *
 * `id`, `created_at`, and `actor` are optional here: the server assigns them when a producer
 * omits them (id and timestamp are generated; the actor defaults to the scoped user).
 *
 * `execution_id` links an event to the agent run that produced it. `trigger_event_id` links a
 * run to the content event that started it.
 */
export interface BaseTimelineEventInput<TType extends TimelineEventType, TData> {
  /** The event type discriminator. */
  type: TType;
  /** The type-specific payload. */
  data: TData;
  /** The run this event belongs to, for lifecycle events. */
  execution_id?: string;
  /** The content event that triggered the run this event belongs to. */
  trigger_event_id?: string;
  /** Server-assigned when omitted. */
  id?: string;
  /** Server-assigned when omitted. */
  created_at?: string;
  /** Defaults to the scoped user when omitted. */
  actor?: EventActor;
}

/**
 * A stored timeline event: the producer fields, plus the server-assigned `id`, `created_at`, and
 * `actor` made required.
 */
export type BaseTimelineEvent<TType extends TimelineEventType, TData> = BaseTimelineEventInput<
  TType,
  TData
> & {
  id: string;
  created_at: string;
  actor: EventActor;
};

/** A message from a user, stored the moment it arrives, apart from any run. */
export type UserMessageEventData = Pick<RoundInput, 'message' | 'attachment_refs'>;
export type UserMessageEvent = BaseTimelineEvent<
  TimelineEventType.userMessage,
  UserMessageEventData
>;

/** A human's answer to a `prompt_requested` event. Resumes a specific run; does not start one. */
export interface PromptResponseEventData {
  /** The `prompt_requested` event this answers. */
  prompt_requested_event_id: string;
  /** The responses, keyed by prompt id. */
  responses: Record<string, PromptResponse>;
}
export type PromptResponseEvent = BaseTimelineEvent<
  TimelineEventType.promptResponse,
  PromptResponseEventData
>;

/** Marks the start of an agent run. */
export interface ExecutionStartedEventData {
  /** What caused the run to start. */
  trigger_type: TimelineTriggerType;
}
export type ExecutionStartedEvent = BaseTimelineEvent<
  TimelineEventType.executionStarted,
  ExecutionStartedEventData
>;

/**
 * The agent paused to ask a human. Terminal for the paused run, the same as
 * `execution_completed`.
 */
export interface PromptRequestedEventData {
  /** The open questions the run is waiting on. */
  prompts: PromptRequest[];
}
export type PromptRequestedEvent = BaseTimelineEvent<
  TimelineEventType.promptRequested,
  PromptRequestedEventData
>;

/**
 * The terminal event of a successful run and the source of truth for it.
 */
export interface ExecutionCompletedEventData {
  /** The final assistant response. */
  response: AssistantResponse;
  /** The intermediate steps (tool calls, reasoning, etc.). */
  steps: ConversationRoundStep[];
  /** Model usage statistics for the run. */
  model_usage: RoundModelUsageStats;
  /** Time to first token, in ms. */
  time_to_first_token: number;
  /** Time to last token, in ms. */
  time_to_last_token: number;
  /** When tracing is enabled, the trace id(s) for the run. */
  trace_id?: string | string[];
}
export type ExecutionCompletedEvent = BaseTimelineEvent<
  TimelineEventType.executionCompleted,
  ExecutionCompletedEventData
>;

/** A run that ended in an error. */
export interface ExecutionFailedEventData {
  /** The serialized error. */
  error: SerializedExecutionError;
}
export type ExecutionFailedEvent = BaseTimelineEvent<
  TimelineEventType.executionFailed,
  ExecutionFailedEventData
>;

/** A run that was stopped before it completed. */
export interface ExecutionAbortedEventData {
  /** Who aborted the run, when known. */
  aborted_by?: EventActor;
}
export type ExecutionAbortedEvent = BaseTimelineEvent<
  TimelineEventType.executionAborted,
  ExecutionAbortedEventData
>;

/** The discriminated union of all stored timeline events. */
export type TimelineEvent =
  | UserMessageEvent
  | PromptResponseEvent
  | ExecutionStartedEvent
  | PromptRequestedEvent
  | ExecutionCompletedEvent
  | ExecutionFailedEvent
  | ExecutionAbortedEvent;

/** A timeline event as supplied by a caller, before the server assigns id/created_at/actor. */
export type TimelineEventInput =
  | BaseTimelineEventInput<TimelineEventType.userMessage, UserMessageEventData>
  | BaseTimelineEventInput<TimelineEventType.promptResponse, PromptResponseEventData>
  | BaseTimelineEventInput<TimelineEventType.executionStarted, ExecutionStartedEventData>
  | BaseTimelineEventInput<TimelineEventType.promptRequested, PromptRequestedEventData>
  | BaseTimelineEventInput<TimelineEventType.executionCompleted, ExecutionCompletedEventData>
  | BaseTimelineEventInput<TimelineEventType.executionFailed, ExecutionFailedEventData>
  | BaseTimelineEventInput<TimelineEventType.executionAborted, ExecutionAbortedEventData>;

/**
 * The run lock held on a conversation while an execution is active.
 */
export interface ActiveExecution {
  execution_id: string;
  trigger_event_id: string;
  started_at: string;
}
