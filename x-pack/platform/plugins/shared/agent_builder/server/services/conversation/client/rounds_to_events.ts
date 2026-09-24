/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationEvent,
  ConversationRound,
  ConversationRoundAuthor,
  ConversationRoundStep,
  EventActor,
  ExecutionInterruption,
  ExecutionInterruptionType,
  ExecutionOutcome,
  ExecutionPartialRunSummary,
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
  executionTerminatedEventId,
  isZeroModelUsage,
  feedbackEventId,
  parseExecutionId,
  resumeExecutionId,
  roundStepEventId,
} from '@kbn/agent-builder-common';
import type { PromptResponse } from '@kbn/agent-builder-common/agents/prompts';

const ROUND_DERIVED_EVENT_ID_SUFFIX_VALUES: readonly string[] = [
  ROUND_DERIVED_EVENT_ID_SUFFIXES.userMessage,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.executionStarted,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.executionTerminated,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.executionFailed,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.executionAborted,
  ROUND_DERIVED_EVENT_ID_SUFFIXES.execution,
];

const STEP_EVENT_ID_PATTERN = /::step::\d+$/;
// A resume writes a `prompt_response` event `${roundId}::prompt_response::${k}`. It is round-derived
// (regenerated/preserved with its round), so it must not be treated as an additive event.
const PROMPT_RESPONSE_EVENT_ID_PATTERN = /::prompt_response::\d+$/;

/** True when `id` was produced by {@link roundToEvents} or the resume append path. */
export const isRoundDerivedEventId = (id: string): boolean =>
  ROUND_DERIVED_EVENT_ID_SUFFIX_VALUES.some((suffix) => id.endsWith(suffix)) ||
  STEP_EVENT_ID_PATTERN.test(id) ||
  PROMPT_RESPONSE_EVENT_ID_PATTERN.test(id);

/** Round-derived event ids for a given round, keyed for readability. */
const roundDerivedEventIds = (roundId: string) => ({
  userMessage: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.userMessage}`,
  executionStarted: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionStarted}`,
  executionTerminated: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionTerminated}`,
  execution: `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.execution}`,
});

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
  const terminal = hasInterruption(round)
    ? roundInterruptedTerminalEvent(round, conversation)
    : roundTerminatedEvent(round, conversation);
  return [
    ...roundStartEvents(round, conversation),
    ...roundStepEvents(round, conversation),
    ...(terminal ? [terminal] : []),
  ];
};

const feedbackEventForRound = (
  roundId: string,
  feedback: NonNullable<ConversationRound['feedback']>,
  conversation: ConversationForRoundEvents
): TimelineEvent =>
  ({
    id: feedbackEventId(roundId),
    type: TimelineEventType.roundFeedback,
    created_at: feedback.submitted_at,
    actor: {
      type: EventActorType.user,
      id: conversation.user?.id ?? conversation.user?.username ?? 'unknown',
      ...(conversation.user?.username ? { username: conversation.user.username } : {}),
    },
    data: { round_id: roundId, ...feedback },
  } as TimelineEvent);

export const roundsToEvents = (conversation: Conversation): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  for (const round of conversation.rounds) {
    events.push(...roundToEvents(round, conversation));
    if (round.feedback) {
      events.push(feedbackEventForRound(round.id, round.feedback, conversation));
    }
  }
  return events;
};

/**
 * Synthesizes feedback events for any rounds that have `round.feedback` stored directly on the
 * round but no corresponding `round_feedback` event in `existingEvents`. This covers events-native
 * documents whose feedback was written by the pre-events `updateRoundFeedback` implementation
 * (which stored feedback only on `conversation_rounds`). Rounds that already have any feedback
 * event — including a retract tombstone — are left untouched.
 */
export const backfillRoundFeedbackEvents = (
  conversation: Conversation,
  existingEvents: ConversationEvent[]
): TimelineEvent[] => {
  const roundsWithFeedbackEvent = new Set(
    existingEvents
      .filter((e) => e.type === TimelineEventType.roundFeedback)
      .map((e) => (e.data as { round_id: string }).round_id)
  );
  return conversation.rounds
    .filter((round) => round.feedback && !roundsWithFeedbackEvent.has(round.id))
    .map((round) => feedbackEventForRound(round.id, round.feedback!, conversation));
};

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

/** The `execution_started` event id for an execution index (0 = the initial run). */
export const executionStartedEventId = (roundId: string, executionIndex: number): string =>
  executionIndex === 0
    ? `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.executionStarted}`
    : `${resumeExecutionId(roundId, executionIndex)}${
        ROUND_DERIVED_EVENT_ID_SUFFIXES.executionStarted
      }`;

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

/** The `prompt_response` link event id written for the k-th resume of a round. */
export const promptResponseEventId = (roundId: string, executionIndex: number): string =>
  `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.promptResponse}::${executionIndex}`;

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

/** The terminal event id of an interrupted execution (0 = the initial run). */
export const executionInterruptedEventId = (
  roundId: string,
  executionIndex: number,
  interruptionType: ExecutionInterruptionType
): string => {
  const suffix =
    interruptionType === 'failed'
      ? ROUND_DERIVED_EVENT_ID_SUFFIXES.executionFailed
      : ROUND_DERIVED_EVENT_ID_SUFFIXES.executionAborted;
  return executionIndex === 0
    ? `${roundId}${suffix}`
    : `${resumeExecutionId(roundId, executionIndex)}${suffix}`;
};

/**
 * Projects an interrupted execution (failed or aborted): `execution_started`, one `execution_step`
 * per step completed before the interruption, and exactly one terminal event whose `created_at`
 * is `startedAt + time_to_last_token`. Mirrors {@link roundToEvents} for the initial execution
 * (`exec_0`) and {@link resumeExecutionToEvents} for a resume (`exec_k`); steps are never
 * duplicated into the terminal payload.
 */
export const interruptedExecutionToEvents = ({
  roundId,
  executionIndex,
  startedAt,
  triggerEventId,
  steps,
  summary,
  interruption,
  conversation,
}: {
  roundId: string;
  executionIndex: number;
  startedAt: string;
  /** The `user_message` (exec_0) or `prompt_response` (exec_k) event id that triggered the run. */
  triggerEventId: string;
  steps: ConversationRoundStep[];
  summary: ExecutionPartialRunSummary;
  interruption: ExecutionInterruption;
  conversation: Conversation;
}): TimelineEvent[] => {
  const isInitial = executionIndex === 0;
  const executionId = isInitial
    ? `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.execution}`
    : resumeExecutionId(roundId, executionIndex);
  const started = isInitial
    ? executionStartedEvent({ id: roundId, started_at: startedAt }, conversation)
    : resumeExecutionStartedEvent({
        roundId,
        executionIndex,
        startedAt,
        triggerEventId,
        conversation,
      });
  const stepEvents: TimelineEvent[] = steps.map((step, sequence) => ({
    id: isInitial
      ? roundStepEventId(roundId, sequence)
      : `${executionId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.stepPrefix}${sequence}`,
    type: TimelineEventType.executionStep,
    created_at: startedAt,
    actor: agentActor(conversation),
    execution_id: executionId,
    trigger_event_id: triggerEventId,
    data: { step, sequence },
  }));
  return [
    started,
    ...stepEvents,
    interruptedTerminalEvent({
      roundId,
      executionIndex,
      startedAt,
      triggerEventId,
      summary,
      interruption,
      conversation,
    }),
  ];
};

/**
 * The terminal event of an interrupted execution: `execution_failed` carrying the error, or
 * `execution_aborted` carrying `aborted_by` when known. `created_at` is `startedAt + time_to_last_token`.
 */
export const interruptedTerminalEvent = ({
  roundId,
  executionIndex,
  startedAt,
  triggerEventId,
  summary,
  interruption,
  conversation,
}: {
  roundId: string;
  executionIndex: number;
  startedAt: string;
  triggerEventId: string;
  summary: ExecutionPartialRunSummary;
  interruption: ExecutionInterruption;
  conversation: ConversationForRoundEvents;
}): TimelineEvent => {
  const executionId =
    executionIndex === 0
      ? `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.execution}`
      : resumeExecutionId(roundId, executionIndex);
  const endedAt = new Date(
    new Date(startedAt).getTime() + summary.time_to_last_token
  ).toISOString();
  const base = {
    id: executionInterruptedEventId(roundId, executionIndex, interruption.type),
    created_at: endedAt,
    actor: agentActor(conversation),
    execution_id: executionId,
    trigger_event_id: triggerEventId,
  };
  return interruption.type === 'failed'
    ? {
        ...base,
        type: TimelineEventType.executionFailed,
        data: { ...summary, error: interruption.error },
      }
    : {
        ...base,
        type: TimelineEventType.executionAborted,
        data: {
          ...summary,
          ...(interruption.aborted_by ? { aborted_by: interruption.aborted_by } : {}),
        },
      };
};

/**
 * The terminal of a round with an `interruption`. Defaults are reversed so that rounds → events →
 * rounds is an identity: a `ZERO_MODEL_USAGE` is omitted (the fold restores it), a `0`
 * `time_to_first_token` is omitted (the fold reads `?? 0`).
 */
const roundInterruptedTerminalEvent = (
  round: ConversationRound & { interruption: ExecutionInterruption },
  conversation: ConversationForRoundEvents
): TimelineEvent => {
  const ids = roundDerivedEventIds(round.id);
  const summary: ExecutionPartialRunSummary = {
    time_to_last_token: round.time_to_last_token,
    ...(round.time_to_first_token !== 0 ? { time_to_first_token: round.time_to_first_token } : {}),
    ...(isZeroModelUsage(round.model_usage) ? {} : { model_usage: round.model_usage }),
    ...(round.trace_id ? { trace_id: round.trace_id } : {}),
    ...(round.configuration_overrides
      ? { configuration_overrides: round.configuration_overrides }
      : {}),
  };
  return interruptedTerminalEvent({
    roundId: round.id,
    executionIndex: 0,
    startedAt: round.started_at,
    triggerEventId: ids.userMessage,
    summary,
    interruption: round.interruption,
    conversation,
  });
};

const hasInterruption = (
  round: ConversationRound
): round is ConversationRound & { interruption: ExecutionInterruption } =>
  round.interruption !== undefined;

/**
 * Index of the round's most recent execution that has an `execution_terminated`, or -1. This is
 * the execution a HITL `prompt_response` answers: an interrupted resume never owns the pause, so
 * a retry after a failed `exec_k` still links to the last *terminated* execution.
 */
export const lastTerminatedExecutionIndex = (
  conversation: Pick<Conversation, 'events'>,
  roundId: string
): number =>
  (conversation.events ?? []).reduce((last, event) => {
    if (event.type !== TimelineEventType.executionTerminated || !event.execution_id) {
      return last;
    }
    const parsed = parseExecutionId(event.execution_id);
    return parsed?.roundId === roundId ? Math.max(last, parsed.index) : last;
  }, -1);
