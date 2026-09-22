/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationRound,
  ConversationRoundStep,
} from '@kbn/agent-builder-common';
import {
  isAskUserQuestionStep,
  isTodosStep,
  isToolCallStep,
  parseExecutionId,
} from '@kbn/agent-builder-common';
import {
  isAskUserQuestionPromptResponse,
  type PromptRequest,
} from '@kbn/agent-builder-common/agents/prompts';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import {
  TimelineEventType,
  isEventsNativeVersion,
  isTimelineEvent,
  type ExecutionStepEvent,
  type ExecutionTerminatedEvent,
  type PromptResponseEvent,
  type TimelineEvent,
  type UserMessageEvent,
} from '@kbn/agent-builder-common/chat/timeline_events';
import { eventsToRounds } from '../../../conversation/client/events_to_rounds';
import { roundsToEvents } from '../../../conversation/client/rounds_to_events';
import { applyStepUpdates, stepUpdates, type RunStepUpdate } from '../step_state';

/** A logical turn of the conversation: one user message and every execution it triggered. */
export interface ConversationTurn {
  /** The round id: `parseExecutionId(executionId)?.roundId`, or the execution id itself for ids outside the derived scheme. */
  id: string;
  userMessage: UserMessageEvent;
  /** The logical steps after folding every successful resume. */
  steps: ConversationRoundStep[];
  /** The latest successful execution's terminated event; its outcome tells whether the turn is paused. */
  terminated: ExecutionTerminatedEvent;
  /** Prompts still awaiting a response (empty when the turn responded). */
  pendingPrompts: PromptRequest[];
  state?: RoundState;
}

/** A turn ready to resume: the logical turn plus the legacy compat round used for merge semantics. */
export interface PendingTurn extends ConversationTurn {
  compatRound: ConversationRound;
}

interface ExecutionBucket {
  executionId: string;
  triggerEventId?: string;
  stepEvents: ExecutionStepEvent[];
  terminated?: ExecutionTerminatedEvent;
}

const bucketExecutions = (events: TimelineEvent[]): ExecutionBucket[] => {
  const buckets = new Map<string, ExecutionBucket>();
  for (const event of events) {
    if (!event.execution_id) {
      continue;
    }
    const bucket = buckets.get(event.execution_id) ?? {
      executionId: event.execution_id,
      stepEvents: [],
    };
    // any event of the execution may carry the trigger; the first one seen wins (same as eventsToRounds)
    if (!bucket.triggerEventId && event.trigger_event_id) {
      bucket.triggerEventId = event.trigger_event_id;
    }
    if (event.type === TimelineEventType.executionStep) {
      bucket.stepEvents.push(event);
    }
    if (event.type === TimelineEventType.executionTerminated) {
      bucket.terminated = event;
    }
    buckets.set(event.execution_id, bucket);
  }
  return [...buckets.values()];
};

/**
 * Same rule as `eventsToRounds`: dedupe by event id, order by `sequence`, fall back to the terminal
 * snapshot. The result goes through the reducer with no updates so it carries the reducer's todos
 * invariant (a single trailing todos step): a legacy round that was resumed carries one todos step
 * per execution (`mergeRounds` concatenates steps) and `roundsToEvents` projects all of them into a
 * single bucket.
 */
const executionSteps = ({ stepEvents, terminated }: ExecutionBucket): ConversationRoundStep[] => {
  const raw =
    stepEvents.length === 0
      ? terminated?.data.steps ?? []
      : [...new Map(stepEvents.map((event) => [event.id, event])).values()]
          .sort((a, b) => a.data.sequence - b.data.sequence)
          .map((event) => event.data.step);
  return applyStepUpdates(raw, []);
};

/** Converts a resume execution's persisted (execution-owned) steps into updates over the turn's steps. */
const stepsToUpdates = (
  steps: ConversationRoundStep[],
  existing: ConversationRoundStep[]
): RunStepUpdate[] => {
  const knownToolCallIds = new Set(existing.filter(isToolCallStep).map((s) => s.tool_call_id));
  return steps.map((step) => {
    if (isToolCallStep(step)) {
      return knownToolCallIds.has(step.tool_call_id)
        ? stepUpdates.resolveToolCall({
            toolCallId: step.tool_call_id,
            toolId: step.tool_id,
            results: step.results,
            progression: step.progression ?? [],
          })
        : stepUpdates.appendToolCall(step);
    }
    if (isTodosStep(step)) {
      return stepUpdates.setTodos(step);
    }
    if (isAskUserQuestionStep(step)) {
      return stepUpdates.upsertQuestion(step);
    }
    return stepUpdates.append(step);
  });
};

const applyPromptResponse = (
  steps: ConversationRoundStep[],
  response: PromptResponseEvent
): ConversationRoundStep[] =>
  steps.map((step) => {
    if (!isAskUserQuestionStep(step) || step.answers !== undefined) {
      return step;
    }
    const answer = response.data.responses[step.prompt_id];
    return answer && isAskUserQuestionPromptResponse(answer)
      ? { ...step, answers: answer.answers }
      : step;
  });

const pendingPromptsOf = (terminated: ExecutionTerminatedEvent): PromptRequest[] =>
  terminated.data.outcome.type === 'prompt_requested' ? terminated.data.outcome.prompts : [];

/** Folds a timeline into logical turns: one per user message, with every successful resume applied. */
export const foldConversationTurns = (events: TimelineEvent[]): ConversationTurn[] => {
  const byId = new Map(events.map((event) => [event.id, event]));
  const turns: ConversationTurn[] = [];
  const turnByTerminatedId = new Map<string, ConversationTurn>();

  for (const bucket of bucketExecutions(events)) {
    if (!bucket.terminated || !bucket.triggerEventId) {
      continue;
    }
    const trigger = byId.get(bucket.triggerEventId);
    if (!trigger) {
      continue;
    }

    const steps = executionSteps(bucket);

    if (trigger.type === TimelineEventType.userMessage) {
      const turn: ConversationTurn = {
        id: parseExecutionId(bucket.executionId)?.roundId ?? bucket.executionId,
        userMessage: trigger,
        steps,
        terminated: bucket.terminated,
        pendingPrompts: pendingPromptsOf(bucket.terminated),
        state: bucket.terminated.data.state,
      };
      turns.push(turn);
      turnByTerminatedId.set(bucket.terminated.id, turn);
      continue;
    }

    if (trigger.type === TimelineEventType.promptResponse) {
      const turn = turnByTerminatedId.get(trigger.data.prompt_requested_event_id);
      if (!turn) {
        continue;
      }
      const answered = applyPromptResponse(turn.steps, trigger);
      turn.steps = applyStepUpdates(answered, stepsToUpdates(steps, answered));
      turn.terminated = bucket.terminated;
      turn.pendingPrompts = pendingPromptsOf(bucket.terminated);
      turn.state = bucket.terminated.data.state;
      turnByTerminatedId.set(bucket.terminated.id, turn);
    }
  }
  return turns;
};

/** The events to fold: native events when present, else the rounds projected to events (same predicate as `eventsForContext`). */
const sourceEvents = (conversation: Conversation): TimelineEvent[] =>
  !isEventsNativeVersion(conversation.schema_version) || !conversation.events?.length
    ? roundsToEvents(conversation)
    : conversation.events.filter(isTimelineEvent);

/** The last turn when it is awaiting a prompt response (with its legacy compat round), else undefined. */
export const getPendingTurn = (conversation: Conversation): PendingTurn | undefined => {
  const events = sourceEvents(conversation);
  const last = foldConversationTurns(events).at(-1);
  if (!last || last.pendingPrompts.length === 0) {
    return undefined;
  }
  const compatRound = eventsToRounds(events).find((round) => round.id === last.id);
  if (!compatRound) {
    // Both folds accept the same executions, so this is a bug — failing here beats silently running
    // the prompt response as a brand-new round and leaving the paused turn open forever.
    throw createAgentExecutionError(
      `[resume] no legacy round found for pending turn "${last.id}"`,
      AgentExecutionErrorCode.invalidState,
      {}
    );
  }
  return { ...last, compatRound };
};
