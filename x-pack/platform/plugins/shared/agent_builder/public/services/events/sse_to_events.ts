/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BackgroundAgentCompleteStep,
  ChatEvent,
  CompactionStep,
  ConversationEvent,
  ConversationRoundStep,
  EventActor,
  ToolCallStep,
  TimelineEvent,
  TodosStep,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStepType,
  TimelineEventType,
  executionStepEventId,
  executionTerminatedEventId,
  findTodosStep,
  isBackgroundAgentCompleteEvent,
  isCompactionCompletedEvent,
  isCompactionStartedEvent,
  isCompactionStep,
  isExecutionStartedEvent,
  isExecutionTerminatedEvent,
  isMessageChunkEvent,
  isMessageCompleteEvent,
  isReasoningEvent,
  isThinkingCompleteEvent,
  isTodosUpdatedEvent,
  isToolCallEvent,
  isToolCallStep,
  isToolProgressEvent,
  isToolResultEvent,
  parseExecutionId,
} from '@kbn/agent-builder-common';
import {
  createReasoningStep,
  createToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';

/**
 * A client-only event type carrying the half-written answer of a running execution.
 * It is never stored, so it is deliberately absent from `TimelineEventType`: the open
 * `ConversationEvent` envelope is what allows a custom type here.
 */
export const EXECUTION_STREAMING_EVENT_TYPE = 'execution_streaming' as const;

export interface ExecutionStreamingEventData {
  /** The answer text received so far. */
  message: string;
  /** Known once `thinking_complete` arrives; the terminal event carries it afterwards. */
  time_to_first_token?: number;
}

export type ExecutionStreamingEvent = ConversationEvent<
  typeof EXECUTION_STREAMING_EVENT_TYPE,
  ExecutionStreamingEventData
>;

/** What the timeline renders: stored events plus the client-only streaming event. */
export type TimelineDisplayEvent = TimelineEvent | ExecutionStreamingEvent;

export const isExecutionStreamingEvent = (event: {
  type: string;
}): event is ExecutionStreamingEvent => event.type === EXECUTION_STREAMING_EVENT_TYPE;

/** Identity of the execution currently streaming, learnt from its `execution_started` event. */
interface ExecutionCursor {
  roundId: string;
  /** 0 for the initial run, k for the k-th resume. */
  index: number;
  executionId: string;
  triggerEventId?: string;
  actor: EventActor;
}

export interface LiveEventsState {
  /** The events produced so far, in timeline order. */
  events: TimelineDisplayEvent[];
  /** Identity of the execution being streamed, absent before `execution_started`. */
  cursor?: ExecutionCursor;
  /** Steps of the current execution; the array index is the step's `sequence`. */
  steps: ConversationRoundStep[];
  /** Answer text accumulated for the current execution. */
  message: string;
  timeToFirstToken?: number;
}

export const emptyLiveEventsState = (): LiveEventsState => ({
  events: [],
  steps: [],
  message: '',
});

/** Adds an event, or replaces the one already holding its id. */
export const upsertEvent = (
  events: TimelineDisplayEvent[],
  event: TimelineDisplayEvent
): TimelineDisplayEvent[] => {
  const index = events.findIndex((existing) => existing.id === event.id);
  if (index === -1) {
    return [...events, event];
  }
  const next = [...events];
  next[index] = event;
  return next;
};

const stepEvent = (
  { cursor }: LiveEventsState,
  step: ConversationRoundStep,
  sequence: number
): TimelineDisplayEvent | undefined => {
  if (!cursor) {
    return undefined;
  }
  const { roundId, index, executionId, triggerEventId, actor } = cursor;
  return {
    id: executionStepEventId(roundId, index, sequence),
    type: TimelineEventType.executionStep,
    created_at: new Date().toISOString(),
    actor,
    execution_id: executionId,
    ...(triggerEventId ? { trigger_event_id: triggerEventId } : {}),
    data: { step, sequence },
  };
};

/** The step a tool call event refers to, with the sequence its event id is built from. */
const findToolCallStep = (
  steps: ConversationRoundStep[],
  toolCallId: string
): { sequence: number; step: ToolCallStep } | undefined => {
  const sequence = steps.findIndex(
    (step) => isToolCallStep(step) && step.tool_call_id === toolCallId
  );
  // A resume never sees the tool call it resolves: that call was made by the execution that
  // paused, and a new execution starts its own steps. The saved events bring the resolved step.
  if (sequence === -1) {
    return undefined;
  }
  const step = steps[sequence];
  return isToolCallStep(step) ? { sequence, step } : undefined;
};

/** Replaces the step at `sequence` and re-emits its event. */
const withStepAt = (
  state: LiveEventsState,
  sequence: number,
  step: ConversationRoundStep
): LiveEventsState => {
  const steps = [...state.steps];
  steps[sequence] = step;
  const next = { ...state, steps };
  const event = stepEvent(next, step, sequence);
  return event ? { ...next, events: upsertEvent(state.events, event) } : next;
};

/** Appends a step and emits its event. */
const withAppendedStep = (state: LiveEventsState, step: ConversationRoundStep): LiveEventsState =>
  withStepAt(state, state.steps.length, step);

/**
 * The half-written answer. Its id is the id the real `execution_terminated` will have, so the
 * terminal event replaces it over SSE, and the stored one replaces it again after a refetch.
 */
const withStreamingEvent = (state: LiveEventsState): LiveEventsState => {
  const { cursor } = state;
  if (!cursor) {
    return state;
  }
  const { roundId, index, executionId, triggerEventId, actor } = cursor;
  const id = executionTerminatedEventId(roundId, index);
  const hasContent = state.message !== '' || state.timeToFirstToken !== undefined;
  // Nothing to show and nothing to clear: do not put an empty event on the timeline.
  if (!hasContent && !state.events.some((event) => event.id === id)) {
    return state;
  }
  const streaming: ExecutionStreamingEvent = {
    id,
    type: EXECUTION_STREAMING_EVENT_TYPE,
    created_at: new Date().toISOString(),
    actor,
    execution_id: executionId,
    ...(triggerEventId ? { trigger_event_id: triggerEventId } : {}),
    data: {
      message: state.message,
      ...(state.timeToFirstToken !== undefined
        ? { time_to_first_token: state.timeToFirstToken }
        : {}),
    },
  };
  return { ...state, events: upsertEvent(state.events, streaming) };
};

/**
 * Folds one raw SSE event into the list of timeline events the run has produced so far.
 * Pure: the same state and event always give the same result.
 */
export const sseToEvents = (state: LiveEventsState, event: ChatEvent): LiveEventsState => {
  if (isExecutionStartedEvent(event)) {
    const execution = event.execution_id ? parseExecutionId(event.execution_id) : undefined;
    if (!execution || !event.execution_id) {
      return state;
    }
    return {
      ...state,
      cursor: {
        roundId: execution.roundId,
        index: execution.index,
        executionId: event.execution_id,
        ...(event.trigger_event_id ? { triggerEventId: event.trigger_event_id } : {}),
        actor: event.actor,
      },
      // A new execution starts its own step numbering and its own answer.
      steps: [],
      message: '',
      timeToFirstToken: undefined,
      events: upsertEvent(state.events, event),
    };
  }

  if (isExecutionTerminatedEvent(event)) {
    return {
      ...state,
      cursor: undefined,
      steps: [],
      message: '',
      timeToFirstToken: undefined,
      events: upsertEvent(state.events, event),
    };
  }

  // Without the cursor there is no execution id to build event ids from, so the event is
  // dropped. The server emits `execution_started` off `round_started`, the first event of a run,
  // so a real stream never reaches this.
  if (!state.cursor) {
    return state;
  }

  if (isReasoningEvent(event)) {
    if (event.data.transient) {
      return state;
    }
    // A reasoning block ends the answer text written so far; the next chunks start a new one.
    return withStreamingEvent(
      withAppendedStep(
        { ...state, message: '' },
        createReasoningStep({
          reasoning: event.data.reasoning,
          tool_call_id: event.data.tool_call_id,
          tool_call_group_id: event.data.tool_call_group_id,
        })
      )
    );
  }

  if (isMessageChunkEvent(event)) {
    return withStreamingEvent({ ...state, message: state.message + event.data.text_chunk });
  }

  if (isMessageCompleteEvent(event)) {
    return withStreamingEvent({ ...state, message: event.data.message_content });
  }

  if (isThinkingCompleteEvent(event)) {
    return withStreamingEvent({ ...state, timeToFirstToken: event.data.time_to_first_token });
  }

  if (isToolCallEvent(event)) {
    return withAppendedStep(
      state,
      createToolCallStep({
        params: event.data.params,
        results: [],
        tool_call_id: event.data.tool_call_id,
        tool_id: event.data.tool_id,
        tool_call_group_id: event.data.tool_call_group_id,
        tool_origin: event.data.tool_origin,
      })
    );
  }

  if (isToolProgressEvent(event)) {
    const { tool_call_id: toolCallId, message, metadata } = event.data;
    const found = findToolCallStep(state.steps, toolCallId);
    if (!found) {
      return state;
    }
    const { sequence, step } = found;
    return withStepAt(state, sequence, {
      ...step,
      progression: [...(step.progression ?? []), { message, metadata: metadata ?? {} }],
    });
  }

  if (isToolResultEvent(event)) {
    const { tool_call_id: toolCallId, results } = event.data;
    const found = findToolCallStep(state.steps, toolCallId);
    if (!found) {
      return state;
    }
    return withStepAt(state, found.sequence, { ...found.step, results });
  }

  if (isCompactionStartedEvent(event)) {
    const step: CompactionStep = {
      type: ConversationRoundStepType.compaction,
      summarized_round_count: 0,
      token_count_before: event.data.token_count_before,
      token_count_after: 0,
    };
    return withAppendedStep(state, step);
  }

  if (isCompactionCompletedEvent(event)) {
    const { token_count_after: tokenCountAfter, summarized_round_count: summarizedRoundCount } =
      event.data;
    // Patch the most recent compaction step - the one the matching `compaction_started` just added.
    for (let sequence = state.steps.length - 1; sequence >= 0; sequence--) {
      const step = state.steps[sequence];
      if (isCompactionStep(step)) {
        return withStepAt(state, sequence, {
          ...step,
          token_count_after: tokenCountAfter,
          summarized_round_count: summarizedRoundCount,
        });
      }
    }
    return state;
  }

  if (isBackgroundAgentCompleteEvent(event)) {
    const step: BackgroundAgentCompleteStep = {
      type: ConversationRoundStepType.backgroundAgentComplete,
      ...event.data.execution,
    };
    return withAppendedStep(state, step);
  }

  if (isTodosUpdatedEvent(event)) {
    const { todos } = event.data.data;
    const existing = findTodosStep(state.steps);
    if (existing) {
      const sequence = state.steps.indexOf(existing);
      return withStepAt(state, sequence, { ...existing, todos, carried_over: false });
    }
    return withAppendedStep(state, {
      type: ConversationRoundStepType.updateTodos,
      todos,
    } as TodosStep);
  }

  return state;
};
