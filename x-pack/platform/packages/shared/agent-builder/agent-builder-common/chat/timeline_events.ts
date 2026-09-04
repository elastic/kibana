/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptRequest, PromptResponse } from '../agents/prompts';
import type { SerializedExecutionError } from '../agents/execution_status';
import type { RuntimeAgentConfigurationOverrides } from '../agents/definition';
import type {
  AssistantResponse,
  ConversationRoundStep,
  ConversationRoundOrigin,
  RoundInput,
  RoundModelUsageStats,
} from './conversation';
import type { RoundState } from './round_state';

/**
 * The projection format that new writes are stamped at.
 */
export const CONVERSATION_SCHEMA_VERSION = 1;

/**
 * The floor for "this document carries a stored events projection".
 */
export const MIN_EVENTS_NATIVE_SCHEMA_VERSION = 1;

export const isEventsNativeVersion = (version: number | undefined): version is number =>
  typeof version === 'number' && version >= MIN_EVENTS_NATIVE_SCHEMA_VERSION;

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
  executionStep = 'execution_step',
  executionTerminated = 'execution_terminated',
  executionFailed = 'execution_failed',
  executionAborted = 'execution_aborted',
}

/**
 * The fields a producer supplies for a timeline event.
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
export type UserMessageEventData = RoundInput;
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

/** A single completed step of an agent run. */
export interface ExecutionStepEventData {
  step: ConversationRoundStep;
  sequence: number;
}
export type ExecutionStepEvent = BaseTimelineEvent<
  TimelineEventType.executionStep,
  ExecutionStepEventData
>;

/**
 * The run summary: everything describing the execution itself, independent of how it ended.
 */
export interface ExecutionRunSummary {
  /** The intermediate steps (tool calls, reasoning, etc.). */
  steps?: ConversationRoundStep[];
  /** Model usage statistics for the run. */
  model_usage: RoundModelUsageStats;
  /** Time to first token, in ms. */
  time_to_first_token: number;
  /** Time to last token, in ms. */
  time_to_last_token: number;
  /** When tracing is enabled, the trace id(s) for the run. */
  trace_id?: string | string[];
  /** Round-level persisted resume state, when present. Carried so rounds round-trip losslessly. */
  state?: RoundState;
  /** Runtime configuration overrides applied to the run, when present. */
  configuration_overrides?: RuntimeAgentConfigurationOverrides;
}

/** How an execution ended: a final response, or a pause to ask the human (HITL). */
export type ExecutionOutcome =
  | { type: 'responded'; response: AssistantResponse }
  | { type: 'prompt_requested'; prompts: PromptRequest[] };

/**
 * The terminal event of a run and the source of truth for it: the run summary plus the outcome.
 * Unifies what were previously `execution_completed` (responded) and `prompt_requested` (paused) —
 * both are emitted at the end of an execution and carry the same run data, so they differ only in
 * the outcome.
 */
export interface ExecutionTerminatedEventData extends ExecutionRunSummary {
  outcome: ExecutionOutcome;
}
export type ExecutionTerminatedEvent = BaseTimelineEvent<
  TimelineEventType.executionTerminated,
  ExecutionTerminatedEventData
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
  | ExecutionStepEvent
  | ExecutionTerminatedEvent
  | ExecutionFailedEvent
  | ExecutionAbortedEvent;

/** A timeline event as supplied by a caller, before the server assigns id/created_at/actor. */
export type TimelineEventInput =
  | BaseTimelineEventInput<TimelineEventType.userMessage, UserMessageEventData>
  | BaseTimelineEventInput<TimelineEventType.promptResponse, PromptResponseEventData>
  | BaseTimelineEventInput<TimelineEventType.executionStarted, ExecutionStartedEventData>
  | BaseTimelineEventInput<TimelineEventType.executionStep, ExecutionStepEventData>
  | BaseTimelineEventInput<TimelineEventType.executionTerminated, ExecutionTerminatedEventData>
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
