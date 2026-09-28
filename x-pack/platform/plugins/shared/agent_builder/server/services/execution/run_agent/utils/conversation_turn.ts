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
import type { ExecutionInterruption } from '@kbn/agent-builder-common/chat/events';
import {
  TimelineEventType,
  interruptionOfTerminal,
  isExecutionTerminalEvent,
  pendingPromptRequest,
  type ExecutionStepEvent,
  type ExecutionTerminalEvent,
  type ExecutionTerminatedEvent,
  type PromptResponseEvent,
  type TimelineEvent,
  type UserMessageEvent,
} from '@kbn/agent-builder-common/chat/timeline_events';
import { eventsToRounds } from '../../../conversation/client/events_to_rounds';
import { sourceEvents } from '../../../conversation/client/source_events';
import { applyStepUpdates, stepUpdates, type RunStepUpdate } from '../step_state';

/** A logical turn of the conversation: one user message and every execution it triggered. */
export interface ConversationTurn {
  /** The round id: `parseExecutionId(executionId)?.roundId`, or the execution id itself for ids outside the derived scheme. */
  id: string;
  userMessage: UserMessageEvent;
  /** The logical steps after folding every resume, successful or interrupted. */
  steps: ConversationRoundStep[];
  /** The latest execution's terminated event; absent when the latest execution was interrupted. */
  terminated?: ExecutionTerminatedEvent;
  /** Prompts still awaiting a response (empty when the turn responded or was interrupted). */
  pendingPrompts: PromptRequest[];
  state?: RoundState;
  /** Set when the turn's latest execution ended without an outcome. */
  interruption?: ExecutionInterruption;
}

/** A turn ready to resume: the logical turn plus the legacy compat round used for merge semantics. */
export interface PendingTurn extends ConversationTurn {
  compatRound: ConversationRound;
}

interface ExecutionBucket {
  executionId: string;
  triggerEventId?: string;
  stepEvents: ExecutionStepEvent[];
  terminal?: ExecutionTerminalEvent;
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
    if (isExecutionTerminalEvent(event)) {
      bucket.terminal = event;
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
const executionSteps = ({ stepEvents, terminal }: ExecutionBucket): ConversationRoundStep[] => {
  const terminated =
    terminal?.type === TimelineEventType.executionTerminated ? terminal : undefined;
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

/** What a bucket's terminal contributes to the turn: a pause's prompts and state, or an interruption. */
const terminalFields = (
  terminal: ExecutionTerminalEvent
): Pick<ConversationTurn, 'terminated' | 'pendingPrompts' | 'state' | 'interruption'> =>
  terminal.type === TimelineEventType.executionTerminated
    ? {
        terminated: terminal,
        pendingPrompts: pendingPromptsOf(terminal),
        state: terminal.data.state,
        interruption: undefined,
      }
    : {
        terminated: undefined,
        pendingPrompts: [],
        state: undefined,
        interruption: interruptionOfTerminal(terminal),
      };

/** Folds a timeline into logical turns: one per user message, with every resume applied. */
export const foldConversationTurns = (events: TimelineEvent[]): ConversationTurn[] => {
  const byId = new Map(events.map((event) => [event.id, event]));
  const turns: ConversationTurn[] = [];
  const turnByTerminatedId = new Map<string, ConversationTurn>();

  for (const bucket of bucketExecutions(events)) {
    if (!bucket.terminal || !bucket.triggerEventId) {
      continue;
    }
    const trigger = byId.get(bucket.triggerEventId);
    if (!trigger) {
      continue;
    }

    const steps = executionSteps(bucket);
    const fields = terminalFields(bucket.terminal);

    if (trigger.type === TimelineEventType.userMessage) {
      const turn: ConversationTurn = {
        id: parseExecutionId(bucket.executionId)?.roundId ?? bucket.executionId,
        userMessage: trigger,
        steps,
        ...fields,
      };
      turns.push(turn);
      if (fields.terminated) {
        turnByTerminatedId.set(fields.terminated.id, turn);
      }
      continue;
    }

    if (trigger.type === TimelineEventType.promptResponse) {
      const turn = turnByTerminatedId.get(trigger.data.prompt_requested_event_id);
      if (!turn) {
        continue;
      }
      const answered = applyPromptResponse(turn.steps, trigger);
      turn.steps = applyStepUpdates(answered, stepsToUpdates(steps, answered));
      turn.terminated = fields.terminated;
      turn.pendingPrompts = fields.pendingPrompts;
      turn.state = fields.state;
      turn.interruption = fields.interruption;
      if (fields.terminated) {
        turnByTerminatedId.set(fields.terminated.id, turn);
      }
    }
  }
  return turns;
};

/** The turn owning the unanswered pause (with its legacy compat round), else undefined. */
export const getPendingTurn = (conversation: Conversation): PendingTurn | undefined => {
  const events = sourceEvents(conversation);
  const pending = pendingPromptRequest(events);
  if (!pending) {
    return undefined;
  }
  const turn = foldConversationTurns(events).find(
    (candidate) => candidate.terminated?.id === pending.id
  );
  if (!turn) {
    throw createAgentExecutionError(
      `[resume] no turn owns the pending prompt request "${pending.id}"`,
      AgentExecutionErrorCode.invalidState,
      {}
    );
  }
  const compatRound = eventsToRounds(events).find((round) => round.id === turn.id);
  if (!compatRound) {
    // Both folds accept the same executions, so this is a bug — failing here beats silently running
    // the prompt response as a brand-new round and leaving the paused turn open forever.
    throw createAgentExecutionError(
      `[resume] no legacy round found for pending turn "${turn.id}"`,
      AgentExecutionErrorCode.invalidState,
      {}
    );
  }
  return { ...turn, compatRound };
};
