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
} as const;

const ROUND_DERIVED_EVENT_ID_SUFFIX_VALUES: readonly string[] = Object.values(
  ROUND_DERIVED_EVENT_ID_SUFFIXES
);

/**
 * True when `id` was produced by {@link roundToEvents}
 */
export const isRoundDerivedEventId = (id: string): boolean =>
  ROUND_DERIVED_EVENT_ID_SUFFIX_VALUES.some((suffix) => id.endsWith(suffix));

/** Round-derived event ids for a given round, keyed for readability. */
const roundDerivedEventIds = (roundId: string) => ({
  userMessage: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.userMessage}`,
  executionStarted: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionStarted}`,
  executionTerminated: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionTerminated}`,
  execution: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.execution}`,
});

/**
 * Converts a single round into its coarse timeline events: `user_message`, `execution_started`,
 * and a terminal `execution_terminated` whose `outcome` is `responded` (completed round) or
 * `prompt_requested` (awaiting-prompt round).
 */
export const roundToEvents = (
  round: ConversationRound,
  conversation: Conversation
): TimelineEvent[] => {
  const ids = roundDerivedEventIds(round.id);
  const agent = agentActor(conversation);
  const endedAt = new Date(
    new Date(round.started_at).getTime() + round.time_to_last_token
  ).toISOString();

  const events: TimelineEvent[] = [
    {
      id: ids.userMessage,
      type: TimelineEventType.userMessage,
      created_at: round.started_at,
      actor: userMessageActor(conversation, round),
      data: round.input,
    },
    {
      id: ids.executionStarted,
      type: TimelineEventType.executionStarted,
      created_at: round.started_at,
      actor: agent,
      execution_id: ids.execution,
      trigger_event_id: ids.userMessage,
      data: { trigger_type: TimelineTriggerType.userMessage },
    },
  ];

  const terminated = (outcome: ExecutionOutcome): TimelineEvent => ({
    id: ids.executionTerminated,
    type: TimelineEventType.executionTerminated,
    created_at: endedAt,
    actor: agent,
    execution_id: ids.execution,
    trigger_event_id: ids.userMessage,
    data: { ...executionRunSummary(round), outcome },
  });

  if (round.status === ConversationRoundStatus.completed) {
    events.push(terminated({ type: 'responded', response: round.response }));
  } else if (round.status === ConversationRoundStatus.awaitingPrompt) {
    events.push(terminated({ type: 'prompt_requested', prompts: round.pending_prompts ?? [] }));
  }

  return events;
};

/**
 * Converts a rounds-based conversation into a timeline, on read. Maps each round with
 * {@link roundToEvents}, in round order.
 */
export const roundsToEvents = (conversation: Conversation): TimelineEvent[] =>
  conversation.rounds.flatMap((round) => roundToEvents(round, conversation));

/** The run summary for a round (shared by both outcomes); the response/prompts live on the outcome. */
const executionRunSummary = (round: ConversationRound): ExecutionRunSummary => ({
  steps: round.steps,
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
  round: ConversationRound
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
const agentActor = (conversation: Conversation): EventActor => ({
  type: EventActorType.agent,
  id: conversation.agent_id,
});
