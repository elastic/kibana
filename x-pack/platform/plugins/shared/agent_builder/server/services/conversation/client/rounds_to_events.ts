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
  ExecutionCompletedEventData,
  TimelineEvent,
  UserMessageEventData,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';

/**
 * Converts a single round into its coarse timeline events: `user_message`, `execution_started`,
 * and a terminal `execution_completed` (or `prompt_requested` when the round is awaiting a prompt).
 */
export const roundToEvents = (
  round: ConversationRound,
  conversation: Conversation
): TimelineEvent[] => {
  const userMessageId = `${round.id}::user_message`;
  const executionId = `${round.id}::execution`;
  const agent = agentActor(conversation);
  const endedAt = new Date(
    new Date(round.started_at).getTime() + round.time_to_last_token
  ).toISOString();

  const events: TimelineEvent[] = [
    {
      id: userMessageId,
      type: TimelineEventType.userMessage,
      created_at: round.started_at,
      actor: userMessageActor(conversation, round),
      data: userMessageData(round),
    },
    {
      id: `${round.id}::execution_started`,
      type: TimelineEventType.executionStarted,
      created_at: round.started_at,
      actor: agent,
      execution_id: executionId,
      trigger_event_id: userMessageId,
      data: { trigger_type: TimelineTriggerType.userMessage },
    },
  ];

  const lifecycle = {
    created_at: endedAt,
    actor: agent,
    execution_id: executionId,
    trigger_event_id: userMessageId,
  };

  if (round.status === ConversationRoundStatus.completed) {
    events.push({
      ...lifecycle,
      id: `${round.id}::execution_completed`,
      type: TimelineEventType.executionCompleted,
      data: executionCompletedData(round),
    });
  } else if (round.status === ConversationRoundStatus.awaitingPrompt) {
    events.push({
      ...lifecycle,
      id: `${round.id}::prompt_requested`,
      type: TimelineEventType.promptRequested,
      data: { ...executionCompletedData(round), prompts: round.pending_prompts ?? [] },
    });
  }

  return events;
};

/**
 * Converts a rounds-based conversation into a timeline, on read. Maps each round with
 * {@link roundToEvents}, in round order.
 */
export const roundsToEvents = (conversation: Conversation): TimelineEvent[] =>
  conversation.rounds.flatMap((round) => roundToEvents(round, conversation));

/** The `user_message` payload for a round: the whole round input, carried verbatim. */
export const userMessageData = (round: ConversationRound): UserMessageEventData => round.input;

/** The run-summary payload for a completed round (also reused for the paused terminal). */
export const executionCompletedData = (round: ConversationRound): ExecutionCompletedEventData => ({
  response: round.response,
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
    type: EventActorType.user,
    id: conversation.user.id ?? conversation.user.username,
    ...(conversation.user.username ? { username: conversation.user.username } : {}),
  };
};

/** Actor for a run's lifecycle events. */
export const agentActor = (conversation: Conversation): EventActor => ({
  type: EventActorType.agent,
  id: conversation.agent_id,
});
