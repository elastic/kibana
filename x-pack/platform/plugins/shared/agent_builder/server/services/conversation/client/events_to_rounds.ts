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
  ConversationRoundStep,
  ExecutionStepEvent,
  ExecutionTerminatedEvent,
  RoundInput,
  TimelineEvent,
  UserMessageEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
  isEventsNativeVersion,
} from '@kbn/agent-builder-common';
import { ROUND_DERIVED_EVENT_ID_SUFFIXES } from './rounds_to_events';

/** Rounds derived from events timeline with a fallback to rounds if no events are present. */
export const roundsForContext = (conversation: Conversation): ConversationRound[] =>
  isEventsNativeVersion(conversation.schema_version) &&
  conversation.events &&
  conversation.events.length > 0
    ? eventsToRounds(conversation.events)
    : conversation.rounds;

/**
 * Reconstructs rounds from a timeline.
 */
export const eventsToRounds = (events: TimelineEvent[]): ConversationRound[] => {
  const byId = new Map(events.map((event) => [event.id, event]));

  // Lifecycle events grouped by execution, in first-seen (round) order.
  const executions = new Map<string, TimelineEvent[]>();
  for (const event of events) {
    if (!event.execution_id) {
      continue;
    }
    const group = executions.get(event.execution_id);
    if (group) {
      group.push(event);
    } else {
      executions.set(event.execution_id, [event]);
    }
  }

  const rounds: ConversationRound[] = [];
  for (const [executionId, group] of executions) {
    const triggerId = group.find((event) => event.trigger_event_id)?.trigger_event_id;
    const trigger = triggerId ? byId.get(triggerId) : undefined;
    if (trigger?.type !== TimelineEventType.userMessage) {
      continue;
    }
    const userMessage = trigger as UserMessageEvent;

    const terminated = group.find(
      (event) => event.type === TimelineEventType.executionTerminated
    ) as ExecutionTerminatedEvent | undefined;

    if (!terminated) {
      continue;
    }

    const stepEvents = group.filter(
      (event): event is ExecutionStepEvent => event.type === TimelineEventType.executionStep
    );
    const steps = stepEvents.length > 0 ? stepsFromEvents(stepEvents) : terminated.data.steps ?? [];

    rounds.push({
      id: roundIdFromExecutionId(executionId),
      input: toRoundInput(userMessage),
      started_at: userMessage.created_at,
      ...authorAndOrigin(userMessage),
      ...terminatedRoundFields(terminated.data, steps),
    });
  }

  return rounds;
};

const stepsFromEvents = (events: ExecutionStepEvent[]): ConversationRoundStep[] => {
  const byId = new Map<string, ExecutionStepEvent>();
  for (const event of events) {
    byId.set(event.id, event);
  }
  return Array.from(byId.values())
    .sort((a, b) => a.data.sequence - b.data.sequence)
    .map((event) => event.data.step);
};

/**
 * `roundToEvents` encodes the round id as `${roundId}::execution`; recover it when present so the
 * conversion round-trips, otherwise fall back to the execution id.
 */
const roundIdFromExecutionId = (executionId: string): string =>
  executionId.endsWith(ROUND_DERIVED_EVENT_ID_SUFFIXES.execution)
    ? executionId.slice(0, -ROUND_DERIVED_EVENT_ID_SUFFIXES.execution.length)
    : executionId;

const toRoundInput = (userMessage: UserMessageEvent): RoundInput => userMessage.data;

const authorAndOrigin = (
  userMessage: UserMessageEvent
): Pick<ConversationRound, 'author' | 'origin'> => {
  const { actor } = userMessage;
  // Only user/external actors carry round authorship; origin is present for external actors only.
  if (actor.type !== EventActorType.user && actor.type !== EventActorType.external) {
    return {};
  }
  const author: ConversationRoundAuthor = {
    id: actor.id,
    ...(actor.username ? { username: actor.username } : {}),
    ...(actor.full_name ? { full_name: actor.full_name } : {}),
  };
  return { author, ...(actor.origin ? { origin: actor.origin } : {}) };
};

const terminatedRoundFields = (
  data: ExecutionTerminatedEvent['data'],
  steps: ConversationRoundStep[]
): Pick<
  ConversationRound,
  | 'status'
  | 'response'
  | 'pending_prompts'
  | 'steps'
  | 'model_usage'
  | 'time_to_first_token'
  | 'time_to_last_token'
  | 'trace_id'
  | 'state'
  | 'configuration_overrides'
> => {
  const { outcome } = data;
  const summary = {
    steps,
    model_usage: data.model_usage,
    time_to_first_token: data.time_to_first_token,
    time_to_last_token: data.time_to_last_token,
    ...(data.trace_id ? { trace_id: data.trace_id } : {}),
    ...(data.state ? { state: data.state } : {}),
    ...(data.configuration_overrides
      ? { configuration_overrides: data.configuration_overrides }
      : {}),
  };

  if (outcome.type === 'responded') {
    return { ...summary, status: ConversationRoundStatus.completed, response: outcome.response };
  }

  // A paused (HITL) run has no response; the rounds model represents it as awaiting_prompt.
  return {
    ...summary,
    status: ConversationRoundStatus.awaitingPrompt,
    pending_prompts: outcome.prompts,
    response: { message: '' },
  };
};
