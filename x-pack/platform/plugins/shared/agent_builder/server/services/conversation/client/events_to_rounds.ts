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
  PromptResponseEvent,
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
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import type { AskUserQuestionAnswer } from '@kbn/agent-builder-common/agents/prompts';
import { isAskUserQuestionPromptResponse } from '@kbn/agent-builder-common/agents/prompts';
import { ROUND_DERIVED_EVENT_ID_SUFFIXES } from './rounds_to_events';
import { applyResumeResolution } from './merge_rounds';

/** Rounds derived from events timeline with a fallback to rounds if no events are present. */
export const roundsForContext = (conversation: Conversation): ConversationRound[] =>
  isEventsNativeVersion(conversation.schema_version) &&
  conversation.events &&
  conversation.events.length > 0
    ? eventsToRounds(conversation.events)
    : conversation.rounds;

/** A single execution reconstructed into a partial round, awaiting the fold. */
interface ExecutionPartial {
  /** 0 for the first execution, k for the k-th resume. */
  order: number;
  round: ConversationRound;
  /** ask_user_question answers carried by the prompt_response that triggered this execution. */
  answers: Map<string, AskUserQuestionAnswer[]>;
  /** This execution's persisted resume state, carried onto the folded round when terminal. */
  state?: RoundState;
}

/**
 * Reconstructs rounds from a timeline.
 */
export const eventsToRounds = (events: TimelineEvent[]): ConversationRound[] => {
  const byId = new Map(events.map((event) => [event.id, event]));

  // Lifecycle events grouped by execution, in first-seen order.
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

  // Bucket executions by the round they belong to, preserving round (first-seen) order.
  const buckets = new Map<string, ExecutionPartial[]>();
  for (const [executionId, group] of executions) {
    const triggerId = group.find((event) => event.trigger_event_id)?.trigger_event_id;
    const trigger = triggerId ? byId.get(triggerId) : undefined;

    // exec_0 is triggered by a user_message; a resume execution by a prompt_response.
    const isInitial = trigger?.type === TimelineEventType.userMessage;
    const isResume = trigger?.type === TimelineEventType.promptResponse;
    if (!isInitial && !isResume) {
      continue;
    }

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

    const userMessage = isInitial ? (trigger as UserMessageEvent) : undefined;
    const round: ConversationRound = {
      id: roundIdFromExecutionId(executionId),
      // A resume execution carries no user message; the fold keeps exec_0's input.
      input: userMessage ? toRoundInput(userMessage) : { message: '' },
      started_at: userMessage ? userMessage.created_at : terminated.created_at,
      ...(userMessage ? authorAndOrigin(userMessage) : {}),
      ...terminatedRoundFields(terminated.data, steps),
    };

    const answers = isResume
      ? answersFromPromptResponse(trigger as PromptResponseEvent)
      : new Map<string, AskUserQuestionAnswer[]>();

    const roundId = roundIdFromExecutionId(executionId);
    const bucket = buckets.get(roundId);
    const partial: ExecutionPartial = {
      order: executionOrderFromId(executionId),
      round,
      answers,
      state: terminated.data.state,
    };
    if (bucket) {
      bucket.push(partial);
    } else {
      buckets.set(roundId, [partial]);
    }
  }

  const rounds: ConversationRound[] = [];
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => a.order - b.order);
    let round = bucket[0].round;
    for (let i = 1; i < bucket.length; i++) {
      round = applyResumeResolution(round, bucket[i].round, bucket[i].answers);
    }
    // `mergeRounds` nulls `state`; carry it from the terminal execution.
    if (bucket.length > 1) {
      const terminalState = bucket[bucket.length - 1].state;
      round = terminalState ? { ...round, state: terminalState } : { ...round, state: undefined };
    }
    rounds.push(round);
  }

  return rounds;
};

/** ask_user_question answers carried by a prompt_response, keyed by prompt_id. */
const answersFromPromptResponse = (
  event: PromptResponseEvent
): Map<string, AskUserQuestionAnswer[]> => {
  const answers = new Map<string, AskUserQuestionAnswer[]>();
  for (const [promptId, response] of Object.entries(event.data.responses)) {
    if (isAskUserQuestionPromptResponse(response)) {
      answers.set(promptId, response.answers);
    }
  }
  return answers;
};

/** `${roundId}::execution` = 0; `${roundId}::execution::${k}` = k. */
const executionOrderFromId = (executionId: string): number => {
  const match = executionId.match(/::execution::(\d+)$/);
  return match ? Number(match[1]) : 0;
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
 * Recovers the round id from an execution id. The first execution is `${roundId}::execution`; a
 * k-th resume execution is `${roundId}::execution::${k}`. Falls back to the execution id when
 * neither shape matches (defensive; should not happen for round-derived ids).
 */
const roundIdFromExecutionId = (executionId: string): string => {
  const resume = executionId.match(/^(.*)::execution::\d+$/);
  if (resume) {
    return resume[1];
  }
  return executionId.endsWith(ROUND_DERIVED_EVENT_ID_SUFFIXES.execution)
    ? executionId.slice(0, -ROUND_DERIVED_EVENT_ID_SUFFIXES.execution.length)
    : executionId;
};

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
