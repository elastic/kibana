/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationRound,
  ConversationRoundAuthor,
  EventActor,
  ExecutionOutcome,
  ExecutionRunSummary,
  RoundInput,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  EventActorType,
  ROUND_DERIVED_EVENT_ID_SUFFIXES,
  TimelineEventType,
  TimelineTriggerType,
  executionStartedEventId,
  executionTerminatedEventId,
  parseExecutionId,
  promptResponseEventId,
  resumeExecutionId,
  roundDerivedEventIds,
  roundStepEventId,
} from '@kbn/agent-builder-common';
import type { PromptResponse } from '@kbn/agent-builder-common/agents/prompts';

/** The fields of a round needed to build its `user_message` start event. */
type RoundStart = Pick<ConversationRound, 'id' | 'input' | 'started_at' | 'author' | 'origin'>;

type ConversationForRoundEvents = Pick<Conversation, 'agent_id' | 'user'>;

export const userMessageEvent = (
  round: RoundStart,
  conversation: ConversationForRoundEvents
): TimelineEvent => ({
  id: `${round.id}${ROUND_DERIVED_EVENT_ID_SUFFIXES.userMessage}`,
  type: TimelineEventType.userMessage,
  created_at: round.started_at,
  actor: userMessageActor(conversation, round),
  data: round.input,
});

export const executionStartedEvent = (
  round: Pick<ConversationRound, 'id' | 'started_at'>,
  conversation: ConversationForRoundEvents
): TimelineEvent => {
  const ids = roundDerivedEventIds(round.id);
  return {
    id: ids.executionStarted,
    type: TimelineEventType.executionStarted,
    created_at: round.started_at,
    actor: agentActor(conversation),
    execution_id: ids.execution,
    trigger_event_id: ids.userMessage,
    data: { trigger_type: TimelineTriggerType.userMessage },
  };
};

export const roundStartEvents = (
  round: RoundStart,
  conversation: ConversationForRoundEvents
): TimelineEvent[] => [
  userMessageEvent(round, conversation),
  executionStartedEvent(round, conversation),
];

export const roundStepEvents = (
  round: Pick<ConversationRound, 'id' | 'started_at' | 'steps'>,
  conversation: ConversationForRoundEvents
): TimelineEvent[] => {
  const ids = roundDerivedEventIds(round.id);
  return (round.steps ?? []).map((step, index) => ({
    id: roundStepEventId(round.id, index),
    type: TimelineEventType.executionStep,
    created_at: round.started_at,
    actor: agentActor(conversation),
    execution_id: ids.execution,
    trigger_event_id: ids.userMessage,
    data: { step, sequence: index },
  }));
};

export const roundTerminatedEvent = (
  round: ConversationRound,
  conversation: ConversationForRoundEvents
): TimelineEvent | undefined => {
  const ids = roundDerivedEventIds(round.id);
  const endedAt = new Date(
    new Date(round.started_at).getTime() + round.time_to_last_token
  ).toISOString();

  const outcome = outcomeForRound(round);
  if (!outcome) {
    return undefined;
  }
  return {
    id: ids.executionTerminated,
    type: TimelineEventType.executionTerminated,
    created_at: endedAt,
    actor: agentActor(conversation),
    execution_id: ids.execution,
    trigger_event_id: ids.userMessage,
    data: { ...executionRunSummary(round), outcome },
  };
};

/** The terminal outcome for a round, or `undefined` for a still-in-progress round (no terminal). */
const outcomeForRound = (round: ConversationRound): ExecutionOutcome | undefined => {
  if (round.status === ConversationRoundStatus.completed) {
    return { type: 'responded', response: round.response };
  }
  if (round.status === ConversationRoundStatus.awaitingPrompt) {
    return { type: 'prompt_requested', prompts: round.pending_prompts ?? [] };
  }
  return undefined;
};

export const roundToEvents = (
  round: ConversationRound,
  conversation: ConversationForRoundEvents
): TimelineEvent[] => {
  const terminated = roundTerminatedEvent(round, conversation);
  return [
    ...roundStartEvents(round, conversation),
    ...roundStepEvents(round, conversation),
    ...(terminated ? [terminated] : []),
  ];
};

/**
 * Converts a rounds-based conversation into a timeline, on read. Maps each round with
 * {@link roundToEvents}, in round order.
 */
export const roundsToEvents = (conversation: Conversation): TimelineEvent[] =>
  conversation.rounds.flatMap((round) => roundToEvents(round, conversation));

const executionRunSummary = (round: ConversationRound): ExecutionRunSummary => ({
  model_usage: round.model_usage,
  time_to_first_token: round.time_to_first_token,
  time_to_last_token: round.time_to_last_token,
  ...(round.trace_id ? { trace_id: round.trace_id } : {}),
  ...(round.state ? { state: round.state } : {}),
  ...(round.configuration_overrides
    ? { configuration_overrides: round.configuration_overrides }
    : {}),
});

/** Actor for a round's `user_message`: the round author (external or user), else the owner. */
export const userMessageActor = (
  conversation: Pick<Conversation, 'user'> | undefined,
  round: Pick<ConversationRound, 'author' | 'origin'>
): EventActor => {
  if (round.author) {
    return {
      type: round.origin ? EventActorType.external : EventActorType.user,
      id: round.author.id,
      ...(round.author.username ? { username: round.author.username } : {}),
      ...(round.author.full_name ? { full_name: round.author.full_name } : {}),
      ...(round.origin ? { origin: round.origin } : {}),
    };
  }

  if (conversation) {
    return {
      type: round.origin ? EventActorType.external : EventActorType.user,
      id: conversation.user.id ?? conversation.user.username,
      ...(conversation.user.username ? { username: conversation.user.username } : {}),
      ...(round.origin ? { origin: round.origin } : {}),
    };
  }

  return {
    type: round.origin ? EventActorType.external : EventActorType.user,
    id: 'unknown',
    ...(round.origin ? { origin: round.origin } : {}),
  };
};

/** Actor for a run's lifecycle events. */
export const agentActor = (conversation: Pick<Conversation, 'agent_id'>): EventActor => ({
  type: EventActorType.agent,
  id: conversation.agent_id,
});

/**
 * The index of the next execution to append to a round. Counts distinct executions already stored
 * for the round on `conversation.events`. Returns 0 when the round has no prior executions.
 */
export const nextResumeIndex = (
  conversation: Pick<Conversation, 'events'>,
  roundId: string
): number => {
  const storedEvents = conversation.events ?? [];
  const roundExecutionIds = new Set(
    storedEvents
      .map((event) => event.execution_id)
      .filter((id): id is string => id !== undefined && parseExecutionId(id)?.roundId === roundId)
  );
  return roundExecutionIds.size;
};

/** Records a human answering a paused round, resuming a specific run. */
export const promptResponseEvent = ({
  roundId,
  executionIndex,
  promptRequestedEventId,
  responses,
  input,
  conversation,
  author,
  createdAt,
}: {
  roundId: string;
  executionIndex: number;
  promptRequestedEventId: string;
  responses: Record<string, PromptResponse>;
  /** The round input the resume contributed; persisted here since a resume has no user_message. */
  input?: RoundInput;
  conversation: Conversation;
  author?: ConversationRoundAuthor;
  createdAt: string;
}): TimelineEvent => ({
  id: promptResponseEventId(roundId, executionIndex),
  type: TimelineEventType.promptResponse,
  created_at: createdAt,
  actor: userMessageActor(conversation, { author }),
  data: {
    prompt_requested_event_id: promptRequestedEventId,
    responses,
    ...(input ? { input } : {}),
  },
});

/**
 * Builds the `execution_started` event for a resume execution (`exec_k`). Shared between the
 * persisted timeline projection ({@link resumeExecutionToEvents}) and the start-time SSE emission
 * so both paths produce byte-identical events for the same `started_at` / trigger.
 */
export const resumeExecutionStartedEvent = ({
  roundId,
  executionIndex,
  startedAt,
  triggerEventId,
  conversation,
}: {
  roundId: string;
  executionIndex: number;
  startedAt: string;
  /** The `prompt_response` event id that triggered this execution. */
  triggerEventId: string;
  conversation: Conversation;
}): TimelineEvent => {
  const executionId = resumeExecutionId(roundId, executionIndex);
  return {
    id: executionStartedEventId(roundId, executionIndex),
    type: TimelineEventType.executionStarted,
    created_at: startedAt,
    actor: agentActor(conversation),
    execution_id: executionId,
    trigger_event_id: triggerEventId,
    data: { trigger_type: TimelineTriggerType.promptResponse },
  };
};

/**
 * Builds the events for a resume execution (`exec_k`). Mirrors {@link roundToEvents} but with
 * execution-scoped ids and a `prompt_response` trigger, and without a `user_message` (a resume
 * continues an existing round, it does not start one).
 */
export const resumeExecutionToEvents = ({
  followUpRound,
  roundId,
  executionIndex,
  triggerEventId,
  conversation,
}: {
  followUpRound: ConversationRound;
  roundId: string;
  executionIndex: number;
  /** The `prompt_response` event id that triggered this execution. */
  triggerEventId: string;
  conversation: Conversation;
}): TimelineEvent[] => {
  const executionId = resumeExecutionId(roundId, executionIndex);
  const startedEvent = resumeExecutionStartedEvent({
    roundId,
    executionIndex,
    startedAt: followUpRound.started_at,
    triggerEventId,
    conversation,
  });
  const stepEvents: TimelineEvent[] = (followUpRound.steps ?? []).map((step, index) => ({
    id: `${executionId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.stepPrefix}${index}`,
    type: TimelineEventType.executionStep,
    created_at: followUpRound.started_at,
    actor: agentActor(conversation),
    execution_id: executionId,
    trigger_event_id: triggerEventId,
    data: { step, sequence: index },
  }));
  const outcome = outcomeForRound(followUpRound);
  const endedAt = new Date(
    new Date(followUpRound.started_at).getTime() + followUpRound.time_to_last_token
  ).toISOString();
  const terminatedEvents: TimelineEvent[] = outcome
    ? [
        {
          id: executionTerminatedEventId(roundId, executionIndex),
          type: TimelineEventType.executionTerminated,
          created_at: endedAt,
          actor: agentActor(conversation),
          execution_id: executionId,
          trigger_event_id: triggerEventId,
          data: { ...executionRunSummary(followUpRound), outcome },
        },
      ]
    : [];
  return [startedEvent, ...stepEvents, ...terminatedEvents];
};
