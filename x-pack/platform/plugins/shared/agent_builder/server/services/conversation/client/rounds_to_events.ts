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
} from '@kbn/agent-builder-common';

/**
 * Converts a legacy (rounds-based) conversation into a timeline, on read.
 *
 * Used only for conversations written before the event producer existed, so they have no stored
 * `events`. Event ids are derived deterministically from the round id, so repeated reads produce
 * stable ids (safe for `after_event_id` cursors). A run's fine-grained detail is not reconstructed
 * here — only the coarse per-round events.
 */
export const roundsToEvents = (conversation: Conversation): TimelineEvent[] => {
  const events: TimelineEvent[] = [];

  for (const round of conversation.rounds) {
    const userMessageId = `${round.id}::user_message`;
    const executionId = `${round.id}::execution`;

    events.push({
      id: userMessageId,
      type: TimelineEventType.userMessage,
      created_at: round.started_at,
      actor: userMessageActor(conversation, round),
      data: userMessageData(round),
    });

    const lifecycle = {
      created_at: round.started_at,
      actor: agentActor(conversation),
      execution_id: executionId,
      trigger_event_id: userMessageId,
    };

    if (round.status === ConversationRoundStatus.awaitingPrompt) {
      events.push({
        ...lifecycle,
        id: `${round.id}::prompt_requested`,
        type: TimelineEventType.promptRequested,
        data: { prompts: round.pending_prompts ?? [] },
      });
    } else {
      events.push({
        ...lifecycle,
        id: `${round.id}::execution_completed`,
        type: TimelineEventType.executionCompleted,
        data: executionCompletedData(round),
      });
    }
  }

  return events;
};

/** The `user_message` payload for a round. Shared by the read converter and the live producer. */
export const userMessageData = (round: ConversationRound): UserMessageEventData => ({
  message: round.input.message,
  ...(round.input.attachment_refs ? { attachment_refs: round.input.attachment_refs } : {}),
});

/** The `execution_completed` payload for a completed round. */
export const executionCompletedData = (round: ConversationRound): ExecutionCompletedEventData => ({
  response: round.response,
  steps: round.steps,
  model_usage: round.model_usage,
  time_to_first_token: round.time_to_first_token,
  time_to_last_token: round.time_to_last_token,
  ...(round.trace_id ? { trace_id: round.trace_id } : {}),
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
