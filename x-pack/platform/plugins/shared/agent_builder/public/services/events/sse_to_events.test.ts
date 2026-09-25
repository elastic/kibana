/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatEvent, ToolCallStep } from '@kbn/agent-builder-common';
import {
  ChatEventType,
  EventActorType,
  TimelineEventType,
  ToolResultType,
  executionStepEventId,
  executionTerminatedEventId,
  isToolCallStep,
} from '@kbn/agent-builder-common';
import type { ExecutionStreamingEvent, LiveEventsState } from './sse_to_events';
import { EXECUTION_STREAMING_EVENT_TYPE, emptyLiveEventsState, sseToEvents } from './sse_to_events';

const ROUND_ID = 'round-1';
const EXECUTION_ID = `${ROUND_ID}::execution`;
const RESUME_EXECUTION_ID = `${ROUND_ID}::execution::1`;
const AGENT_ACTOR = { type: EventActorType.agent, id: 'agent-1' };

const executionStarted = (executionId = EXECUTION_ID): ChatEvent =>
  ({
    type: TimelineEventType.executionStarted,
    id: `${executionId}::execution_started`,
    created_at: '2026-01-01T00:00:00.000Z',
    actor: AGENT_ACTOR,
    execution_id: executionId,
    trigger_event_id: `${ROUND_ID}::user_message`,
    data: { trigger_type: 'user_message' },
  } as ChatEvent);

const executionTerminated = (executionId = EXECUTION_ID): ChatEvent =>
  ({
    type: TimelineEventType.executionTerminated,
    id: executionTerminatedEventId(ROUND_ID, 0),
    created_at: '2026-01-01T00:00:09.000Z',
    actor: AGENT_ACTOR,
    execution_id: executionId,
    trigger_event_id: `${ROUND_ID}::user_message`,
    data: {
      model_usage: { connector_id: '', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
      time_to_first_token: 10,
      time_to_last_token: 20,
      outcome: { type: 'responded', response: { message: 'all done' } },
    },
  } as ChatEvent);

const executionFailed = (): ChatEvent =>
  ({
    type: TimelineEventType.executionFailed,
    id: `${ROUND_ID}::execution_failed`,
    created_at: '2026-01-01T00:00:09.000Z',
    actor: AGENT_ACTOR,
    execution_id: EXECUTION_ID,
    trigger_event_id: `${ROUND_ID}::user_message`,
    data: { error: { code: 'internalError', message: 'boom' }, time_to_last_token: 20 },
  } as ChatEvent);

const executionAborted = (): ChatEvent =>
  ({
    type: TimelineEventType.executionAborted,
    id: `${ROUND_ID}::execution_aborted`,
    created_at: '2026-01-01T00:00:09.000Z',
    actor: AGENT_ACTOR,
    execution_id: EXECUTION_ID,
    trigger_event_id: `${ROUND_ID}::user_message`,
    data: { aborted_by: { source: 'api' }, time_to_last_token: 20 },
  } as ChatEvent);

const chunk = (text: string): ChatEvent =>
  ({ type: ChatEventType.messageChunk, data: { message_id: 'm1', text_chunk: text } } as ChatEvent);

const toolCall = (toolCallId: string): ChatEvent =>
  ({
    type: ChatEventType.toolCall,
    data: { tool_call_id: toolCallId, tool_id: 'my_tool', params: { q: 1 } },
  } as ChatEvent);

const fold = (...events: ChatEvent[]): LiveEventsState =>
  events.reduce(sseToEvents, emptyLiveEventsState());

const ids = (state: LiveEventsState) => state.events.map((event) => event.id);

const streamingEvent = (state: LiveEventsState): ExecutionStreamingEvent | undefined =>
  state.events.find(
    (event): event is ExecutionStreamingEvent => event.type === EXECUTION_STREAMING_EVENT_TYPE
  );

const stepAt = (state: LiveEventsState, id: string): ToolCallStep | undefined => {
  const event = state.events.find((candidate) => candidate.id === id);
  const step = event?.type === TimelineEventType.executionStep ? event.data.step : undefined;
  return step && isToolCallStep(step) ? step : undefined;
};

describe('sseToEvents', () => {
  it('drops agent events until execution_started names the execution', () => {
    expect(fold(chunk('lost')).events).toEqual([]);
  });

  it('learns the execution from execution_started and keeps the event as-is', () => {
    const started = executionStarted();
    const state = fold(started);

    expect(state.cursor).toMatchObject({ roundId: ROUND_ID, index: 0, executionId: EXECUTION_ID });
    expect(state.events).toEqual([started]);
  });

  it('folds chunks into one streaming event keyed by the id the terminal will have', () => {
    const state = fold(executionStarted(), chunk('Hel'), chunk('lo'));

    expect(ids(state)).toEqual([
      `${EXECUTION_ID}::execution_started`,
      executionTerminatedEventId(ROUND_ID, 0),
    ]);
    expect(streamingEvent(state)?.data.message).toBe('Hello');
  });

  it('patches the same step event through tool call, progress and result', () => {
    const stepId = executionStepEventId(ROUND_ID, 0, 0);
    const state = fold(
      executionStarted(),
      toolCall('t1'),
      {
        type: ChatEventType.toolProgress,
        data: { tool_call_id: 't1', message: 'halfway' },
      } as ChatEvent,
      {
        type: ChatEventType.toolResult,
        data: {
          tool_call_id: 't1',
          tool_id: 'my_tool',
          results: [{ tool_result_id: 'r1', type: ToolResultType.other, data: { ok: true } }],
        },
      } as ChatEvent
    );

    expect(ids(state)).toEqual([`${EXECUTION_ID}::execution_started`, stepId]);
    expect(stepAt(state, stepId)).toMatchObject({
      tool_call_id: 't1',
      progression: [{ message: 'halfway', metadata: {} }],
      results: [{ tool_result_id: 'r1', type: ToolResultType.other, data: { ok: true } }],
    });
  });

  it('builds a step from a resume’s tool_result when no tool_call preceded it', () => {
    const stepId = executionStepEventId(ROUND_ID, 1, 0);
    const state = fold(executionStarted(RESUME_EXECUTION_ID), {
      type: ChatEventType.toolResult,
      data: {
        tool_call_id: 't1',
        tool_id: 'my_tool',
        results: [{ tool_result_id: 'r1', type: ToolResultType.other, data: { ok: true } }],
      },
    } as ChatEvent);

    expect(ids(state)).toEqual([`${RESUME_EXECUTION_ID}::execution_started`, stepId]);
    expect(stepAt(state, stepId)).toMatchObject({
      tool_call_id: 't1',
      tool_id: 'my_tool',
      results: [{ tool_result_id: 'r1', type: ToolResultType.other, data: { ok: true } }],
    });
  });

  it('numbers a resume’s steps off its own execution id', () => {
    const state = fold(executionStarted(RESUME_EXECUTION_ID), toolCall('t1'), toolCall('t2'));

    expect(ids(state)).toEqual([
      `${RESUME_EXECUTION_ID}::execution_started`,
      executionStepEventId(ROUND_ID, 1, 0),
      executionStepEventId(ROUND_ID, 1, 1),
    ]);
  });

  it('lets the terminal replace the streaming event and stops the run', () => {
    const terminal = executionTerminated();
    const state = fold(executionStarted(), chunk('half'), terminal);

    expect(state.cursor).toBeUndefined();
    expect(state.events).toEqual([executionStarted(), terminal]);

    // A chunk arriving after the terminal must not overwrite it - they share an id.
    const afterTerminal = sseToEvents(state, chunk(' more'));
    expect(afterTerminal.events).toEqual(state.events);
  });

  it.each([
    ['failed', executionFailed(), `${ROUND_ID}::execution_failed`],
    ['aborted', executionAborted(), `${ROUND_ID}::execution_aborted`],
  ])('a %s terminal seals the run and drops the half-written answer', (_, terminal, id) => {
    const state = fold(executionStarted(), chunk('par'), terminal);

    expect(ids(state)).toEqual([`${EXECUTION_ID}::execution_started`, id]);
    expect(streamingEvent(state)).toBeUndefined();
    expect(state.cursor).toBeUndefined();
  });

  it('puts time_to_first_token on the streaming event', () => {
    const state = fold(executionStarted(), {
      type: ChatEventType.thinkingComplete,
      data: { time_to_first_token: 42 },
    } as ChatEvent);

    expect(streamingEvent(state)?.data).toMatchObject({
      time_to_first_token: 42,
    });
  });

  it('ignores prompt_request events (outcome is carried on the terminal event)', () => {
    const prompt = { id: 'p1', type: 'confirmation', message: 'ok?' };
    const before = fold(executionStarted(), chunk('Hello'));
    const after = sseToEvents(before, {
      type: ChatEventType.promptRequest,
      data: { prompt },
    } as ChatEvent);

    expect(after).toBe(before);
  });
});
