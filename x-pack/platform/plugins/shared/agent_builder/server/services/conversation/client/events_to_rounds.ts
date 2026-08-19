/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  ConversationRoundAuthor,
  ExecutionCompletedEvent,
  PromptRequestedEvent,
  RoundInput,
  RoundModelUsageStats,
  TimelineEvent,
  UserMessageEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';

const EXECUTION_ID_SUFFIX = '::execution';

const EMPTY_MODEL_USAGE: RoundModelUsageStats = {
  connector_id: '',
  llm_calls: 0,
  input_tokens: 0,
  output_tokens: 0,
};

/**
 * Reconstructs rounds from a timeline: the inverse of `roundToEvents`. Groups lifecycle events by
 * `execution_id`, links each execution to the `user_message` that triggered it, and rebuilds one
 * round per execution, in round order.
 *
 * Best-effort: the rounds model cannot represent everything the timeline can. These are accepted,
 * documented losses:
 * - `execution_failed` / `execution_aborted` and still-running executions (no terminal event) have
 *   no round equivalent and are skipped.
 * - `trigger_type` is not recoverable.
 * - Only an `external` author round-trips. A Kibana-user author on a shared conversation (author set,
 *   no origin) is emitted as a `user` actor and cannot be told apart from the owner here, so the
 *   reconstructed round attributes the message to the conversation owner.
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

    const completed = group.find((event) => event.type === TimelineEventType.executionCompleted) as
      | ExecutionCompletedEvent
      | undefined;
    const promptRequested = group.find(
      (event) => event.type === TimelineEventType.promptRequested
    ) as PromptRequestedEvent | undefined;

    // A failed or aborted execution has no round equivalent.
    if (!completed && !promptRequested) {
      continue;
    }

    rounds.push({
      id: roundIdFromExecutionId(executionId),
      input: toRoundInput(userMessage),
      started_at: userMessage.created_at,
      ...authorAndOrigin(userMessage),
      ...(completed
        ? completedRoundFields(completed.data)
        : awaitingPromptRoundFields(promptRequested!.data.prompts)),
    });
  }

  return rounds;
};

/**
 * `roundToEvents` encodes the round id as `${roundId}::execution`; recover it when present so the
 * conversion round-trips, otherwise fall back to the execution id.
 */
const roundIdFromExecutionId = (executionId: string): string =>
  executionId.endsWith(EXECUTION_ID_SUFFIX)
    ? executionId.slice(0, -EXECUTION_ID_SUFFIX.length)
    : executionId;

const toRoundInput = (userMessage: UserMessageEvent): RoundInput => ({
  message: userMessage.data.message,
  ...(userMessage.data.attachment_refs
    ? { attachment_refs: userMessage.data.attachment_refs }
    : {}),
});

const authorAndOrigin = (
  userMessage: UserMessageEvent
): Pick<ConversationRound, 'author' | 'origin'> => {
  const { actor } = userMessage;
  if (actor.type !== EventActorType.external) {
    return {};
  }
  const author: ConversationRoundAuthor = {
    id: actor.id,
    ...(actor.username ? { username: actor.username } : {}),
    ...(actor.full_name ? { full_name: actor.full_name } : {}),
  };
  return { author, ...(actor.origin ? { origin: actor.origin } : {}) };
};

const completedRoundFields = (
  data: ExecutionCompletedEvent['data']
): Pick<
  ConversationRound,
  | 'status'
  | 'response'
  | 'steps'
  | 'model_usage'
  | 'time_to_first_token'
  | 'time_to_last_token'
  | 'trace_id'
> => ({
  status: ConversationRoundStatus.completed,
  response: data.response,
  steps: data.steps,
  model_usage: data.model_usage,
  time_to_first_token: data.time_to_first_token,
  time_to_last_token: data.time_to_last_token,
  ...(data.trace_id ? { trace_id: data.trace_id } : {}),
});

const awaitingPromptRoundFields = (
  prompts: PromptRequestedEvent['data']['prompts']
): Pick<
  ConversationRound,
  | 'status'
  | 'pending_prompts'
  | 'response'
  | 'steps'
  | 'model_usage'
  | 'time_to_first_token'
  | 'time_to_last_token'
> => ({
  status: ConversationRoundStatus.awaitingPrompt,
  pending_prompts: prompts,
  response: { message: '' },
  steps: [],
  model_usage: EMPTY_MODEL_USAGE,
  time_to_first_token: 0,
  time_to_last_token: 0,
});
