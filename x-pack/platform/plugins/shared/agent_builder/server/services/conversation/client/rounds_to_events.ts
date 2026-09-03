/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationRound,
  EventActor,
  ExecutionOutcome,
  ExecutionRunSummary,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';

/**
 * Suffixes used to build the ids of every round-derived timeline event.
 */
export const ROUND_DERIVED_EVENT_ID_SUFFIXES = {
  userMessage: '::user_message',
  executionStarted: '::execution_started',
  executionTerminated: '::execution_terminated',
  execution: '::execution',
  stepPrefix: '::step::',
} as const;

const ROUND_DERIVED_EVENT_ID_SUFFIX_VALUES: readonly string[] = [
  ROUND_DERIVED_EVENT_ID_SUFFIXES.userMessage,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.executionStarted,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.executionTerminated,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.execution,
];

const STEP_EVENT_ID_PATTERN = /::step::\d+$/;

/**
 * True when `id` was produced by {@link roundToEvents}
 */
export const isRoundDerivedEventId = (id: string): boolean =>
  ROUND_DERIVED_EVENT_ID_SUFFIX_VALUES.some((suffix) => id.endsWith(suffix)) ||
  STEP_EVENT_ID_PATTERN.test(id);

/** Round-derived event ids for a given round, keyed for readability. */
const roundDerivedEventIds = (roundId: string) => ({
  userMessage: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.userMessage}`,
  executionStarted: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionStarted}`,
  executionTerminated: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionTerminated}`,
  execution: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.execution}`,
});

/** ID for a step event. */
export const roundStepEventId = (roundId: string, sequence: number): string =>
  `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.stepPrefix}${sequence}`;

/** The fields of a round needed to build its `user_message` start event. */
type RoundStart = Pick<ConversationRound, 'id' | 'input' | 'started_at' | 'author' | 'origin'>;

export const userMessageEvent = (round: RoundStart, conversation: Conversation): TimelineEvent => ({
  id: `${round.id}${ROUND_DERIVED_EVENT_ID_SUFFIXES.userMessage}`,
  type: TimelineEventType.userMessage,
  created_at: round.started_at,
  actor: userMessageActor(conversation, round),
  data: round.input,
});

export const executionStartedEvent = (
  round: Pick<ConversationRound, 'id' | 'started_at'>,
  conversation: Conversation
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
  conversation: Conversation
): TimelineEvent[] => [
  userMessageEvent(round, conversation),
  executionStartedEvent(round, conversation),
];

export const roundStepEvents = (
  round: Pick<ConversationRound, 'id' | 'started_at' | 'steps'>,
  conversation: Conversation
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
  conversation: Conversation
): TimelineEvent | undefined => {
  const ids = roundDerivedEventIds(round.id);
  const endedAt = new Date(
    new Date(round.started_at).getTime() + round.time_to_last_token
  ).toISOString();

  const terminated = (outcome: ExecutionOutcome): TimelineEvent => ({
    id: ids.executionTerminated,
    type: TimelineEventType.executionTerminated,
    created_at: endedAt,
    actor: agentActor(conversation),
    execution_id: ids.execution,
    trigger_event_id: ids.userMessage,
    data: { ...executionRunSummary(round), outcome },
  });

  if (round.status === ConversationRoundStatus.completed) {
    return terminated({ type: 'responded', response: round.response });
  }
  if (round.status === ConversationRoundStatus.awaitingPrompt) {
    return terminated({ type: 'prompt_requested', prompts: round.pending_prompts ?? [] });
  }
  return undefined;
};

export const roundToEvents = (
  round: ConversationRound,
  conversation: Conversation
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
  conversation: Conversation,
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

  return {
    type: round.origin ? EventActorType.external : EventActorType.user,
    id: conversation.user.id ?? conversation.user.username,
    ...(conversation.user.username ? { username: conversation.user.username } : {}),
    ...(round.origin ? { origin: round.origin } : {}),
  };
};

/** Actor for a run's lifecycle events. */
export const agentActor = (conversation: Pick<Conversation, 'agent_id'>): EventActor => ({
  type: EventActorType.agent,
  id: conversation.agent_id,
});
