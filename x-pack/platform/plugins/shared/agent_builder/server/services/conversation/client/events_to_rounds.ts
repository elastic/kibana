/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationEvent,
  ConversationRound,
  ConversationRoundAuthor,
  ConversationRoundStep,
  ExecutionAbortedEvent,
  ExecutionFailedEvent,
  ExecutionStepEvent,
  ExecutionTerminatedEvent,
  PromptResponseEvent,
  RoundInput,
  UserMessageEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
  ZERO_MODEL_USAGE,
  answeredPromptRequestIds,
  interruptionOfTerminal,
  isExecutionTerminalEvent,
  isToolCallStep,
  parseExecutionId,
} from '@kbn/agent-builder-common';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import type { AskUserQuestionAnswer } from '@kbn/agent-builder-common/agents/prompts';
import { isAskUserQuestionPromptResponse } from '@kbn/agent-builder-common/agents/prompts';
import { applyResumeResolution } from './merge_rounds';

/** A single execution reconstructed into a partial round, awaiting the fold. */
interface ExecutionPartial {
  /** 0 for the first execution, k for the k-th resume. */
  order: number;
  round: ConversationRound;
  /** ask_user_question answers carried by the prompt_response that triggered this execution. */
  answers: Map<string, AskUserQuestionAnswer[]>;
  /**
   * The resume state this execution's `execution_terminated` persisted, kept even once the pause
   * is answered (the round then carries none): the fold reads its `agent.nodes` to find the tool
   * calls an interrupted resume never reached.
   */
  pauseState?: RoundState;
  /** True when the execution ended with `execution_failed` / `execution_aborted`. */
  interrupted: boolean;
}

/**
 * Reconstructs rounds from a timeline. Every terminated execution — with an outcome, failed or
 * aborted — forms a partial; a round is its executions folded in order. A pause is consumed as
 * soon as a `prompt_response` answers it, however the resume ended.
 */
export const eventsToRounds = (events: ConversationEvent[]): ConversationRound[] => {
  const byId = new Map(events.map((event) => [event.id, event]));
  // `prompt_response` events carry no execution_id, so the join is computed once over everything.
  const answered = answeredPromptRequestIds(events);

  // Lifecycle events grouped by execution, in first-seen order.
  const executions = new Map<string, ConversationEvent[]>();
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
    // An execution id outside the round scheme identifies its own (single-execution) round.
    const execution = parseExecutionId(executionId) ?? { roundId: executionId, index: 0 };
    const triggerId = group.find((event) => event.trigger_event_id)?.trigger_event_id;
    const trigger = triggerId ? byId.get(triggerId) : undefined;

    // exec_0 is triggered by a user_message; a resume execution by a prompt_response.
    const isInitial = trigger?.type === TimelineEventType.userMessage;
    const isResume = trigger?.type === TimelineEventType.promptResponse;
    if (!isInitial && !isResume) {
      continue;
    }

    // An execution with no terminal (in progress) forms no partial.
    const terminal = group.find(isExecutionTerminalEvent);
    if (!terminal) {
      continue;
    }
    const terminated =
      terminal.type === TimelineEventType.executionTerminated ? terminal : undefined;

    const stepEvents = group.filter(
      (event): event is ExecutionStepEvent => event.type === TimelineEventType.executionStep
    );
    // Interrupted terminals carry no steps: an interrupted execution's steps are its step events only.
    const steps =
      stepEvents.length > 0 ? stepsFromEvents(stepEvents) : terminated?.data.steps ?? [];

    const userMessage = isInitial ? (trigger as UserMessageEvent) : undefined;
    const resumeInput = isResume ? (trigger as PromptResponseEvent).data.input : undefined;
    const startedEvent = group.find((event) => event.type === TimelineEventType.executionStarted);
    const round: ConversationRound = {
      id: execution.roundId,
      input: userMessage ? toRoundInput(userMessage) : resumeInput ?? { message: '' },
      started_at: userMessage
        ? userMessage.created_at
        : startedEvent?.created_at ?? terminal.created_at,
      ...(userMessage ? authorAndOrigin(userMessage) : {}),
      ...(terminal.type === TimelineEventType.executionTerminated
        ? terminatedRoundFields(terminal, steps, answered.has(terminal.id))
        : interruptedRoundFields(terminal, steps)),
    };

    const answers = isResume
      ? answersFromPromptResponse(trigger as PromptResponseEvent)
      : new Map<string, AskUserQuestionAnswer[]>();

    const partial: ExecutionPartial = {
      order: execution.index,
      round,
      answers,
      // the terminal's own state, whether or not the pause was answered (`round.state` is
      // already cleared for an answered pause)
      pauseState: terminated?.data.state,
      interrupted: terminated === undefined,
    };
    const bucket = buckets.get(execution.roundId);
    if (bucket) {
      bucket.push(partial);
    } else {
      buckets.set(execution.roundId, [partial]);
    }
  }

  const rounds: ConversationRound[] = [];
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => a.order - b.order);
    // Ignore orphan resumes: a round needs its initial input and authorship.
    if (bucket[0].order !== 0) {
      continue;
    }
    let round = bucket[0].round;
    for (let i = 1; i < bucket.length; i++) {
      const next = bucket[i];
      round = applyResumeResolution(round, next.round, next.answers);
      if (next.interrupted) {
        round = markUnreachedPausedCalls(round, bucket[i - 1].pauseState, next.round.steps);
      }
    }
    // `mergeRounds` nulls `state`; the folded round's resume state is the last execution's round
    // state — present only for an unanswered pause. An interrupted or answered last execution
    // leaves the round with no state: nothing to resume from.
    if (bucket.length > 1) {
      const lastRoundState = bucket[bucket.length - 1].round.state;
      if (lastRoundState) {
        round = { ...round, state: lastRoundState };
      }
    }
    rounds.push(round);
  }

  return rounds;
};

/**
 * The paused execution's tool calls (one `state.agent.nodes` entry each) that an interrupted
 * resume never reached — no copy among its steps — are marked `interrupted` on the merged round.
 * Calls the resume did copy carry their own mark (set by the run tracker) through
 * `applyResumeResolution`; an unmarked copy with an empty `results` is a real empty return.
 */
const markUnreachedPausedCalls = (
  round: ConversationRound,
  pauseState: RoundState | undefined,
  resumeSteps: ConversationRoundStep[]
): ConversationRound => {
  const pausedIds = new Set((pauseState?.agent.nodes ?? []).map((node) => node.tool_call_id));
  if (pausedIds.size === 0) {
    return round;
  }
  const copied = new Set(resumeSteps.filter(isToolCallStep).map((step) => step.tool_call_id));
  return {
    ...round,
    steps: round.steps.map((step) =>
      isToolCallStep(step) && pausedIds.has(step.tool_call_id) && !copied.has(step.tool_call_id)
        ? { ...step, interrupted: true as const }
        : step
    ),
  };
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

const stepsFromEvents = (events: ExecutionStepEvent[]): ConversationRoundStep[] => {
  const byId = new Map<string, ExecutionStepEvent>();
  for (const event of events) {
    byId.set(event.id, event);
  }
  return Array.from(byId.values())
    .sort((a, b) => a.data.sequence - b.data.sequence)
    .map((event) => event.data.step);
};

const toRoundInput = (userMessage: UserMessageEvent): RoundInput => userMessage.data;

/** Round authorship carried by a `user_message` actor. */
export const authorAndOrigin = (
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

type RoundRunFields = Pick<
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
  | 'interruption'
>;

const terminatedRoundFields = (
  terminated: ExecutionTerminatedEvent,
  steps: ConversationRoundStep[],
  answered: boolean
): RoundRunFields => {
  const { data } = terminated;
  const { outcome } = data;
  const summary = {
    steps,
    model_usage: data.model_usage,
    time_to_first_token: data.time_to_first_token,
    time_to_last_token: data.time_to_last_token,
    ...(data.trace_id ? { trace_id: data.trace_id } : {}),
    ...(data.configuration_overrides
      ? { configuration_overrides: data.configuration_overrides }
      : {}),
  };

  if (outcome.type === 'responded') {
    return {
      ...summary,
      ...(data.state ? { state: data.state } : {}),
      status: ConversationRoundStatus.completed,
      response: outcome.response,
    };
  }

  // A consumed pause (some `prompt_response` answers it) is no longer awaiting anything: no
  // prompts, no resume state.
  if (answered) {
    return { ...summary, status: ConversationRoundStatus.completed, response: { message: '' } };
  }

  // A paused (HITL) run has no response; the rounds model represents it as awaiting_prompt.
  return {
    ...summary,
    ...(data.state ? { state: data.state } : {}),
    status: ConversationRoundStatus.awaitingPrompt,
    pending_prompts: outcome.prompts,
    response: { message: '' },
  };
};

/** The round fields of an interrupted execution; explicit defaults for what the partial summary lacks. */
const interruptedRoundFields = (
  terminal: ExecutionFailedEvent | ExecutionAbortedEvent,
  steps: ConversationRoundStep[]
): RoundRunFields => {
  const { data } = terminal;
  return {
    steps,
    model_usage: data.model_usage ?? ZERO_MODEL_USAGE,
    time_to_first_token: data.time_to_first_token ?? 0,
    time_to_last_token: data.time_to_last_token,
    ...(data.trace_id ? { trace_id: data.trace_id } : {}),
    ...(data.configuration_overrides
      ? { configuration_overrides: data.configuration_overrides }
      : {}),
    status: ConversationRoundStatus.completed,
    response: { message: '' },
    interruption: interruptionOfTerminal(terminal),
  };
};
