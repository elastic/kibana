/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRound,
  ConversationRoundStep,
  ToolCallStep,
  ToolResult,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  EventActorType,
  ToolResultType,
  createAskUserQuestionStep,
  createDeliveredMessageStep,
  createInterimAnswerStep,
  createModelReasoningStep,
  createRelevantSkillsStep,
} from '@kbn/agent-builder-common';
import { roundToSessionEvents } from './round_to_session_events';

const ROUND_ID = 'round-1';
const STARTED_AT = '2026-11-27T10:00:00.000Z';
const base = { turn_id: ROUND_ID, event_at: STARTED_AT };

const createRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: ROUND_ID,
  status: ConversationRoundStatus.completed,
  input: { message: 'What is in my index?' },
  steps: [],
  response: { message: 'It holds logs.' },
  started_at: STARTED_AT,
  time_to_first_token: 10,
  time_to_last_token: 20,
  model_usage: { connector_id: 'connector-1', llm_calls: 1, input_tokens: 5, output_tokens: 5 },
  ...overrides,
});

const okResult: ToolResult = {
  tool_result_id: 'result-1',
  type: ToolResultType.other,
  data: { count: 3 },
};

const errorResult: ToolResult = {
  tool_result_id: 'result-2',
  type: ToolResultType.error,
  data: { message: 'index not found' },
};

const toolCall = (
  toolCallId: string,
  overrides: Partial<Omit<ToolCallStep, 'type'>> = {}
): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: toolCallId,
  tool_id: 'platform.core.search',
  params: { query: 'logs' },
  results: [okResult],
  ...overrides,
});

const reasoning = (text: string, transient?: boolean): ConversationRoundStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
  ...(transient !== undefined && { transient }),
});

const steer = (eventId: string, message: string, deliveredAt: string) =>
  createDeliveredMessageStep({
    event_id: eventId,
    author: { type: EventActorType.user, id: 'user-1' },
    is_run_owner: true,
    message,
    delivered_at: deliveredAt,
    cycle: 1,
  });

const userEvent = { ...base, id: 'round-1:user', type: 'user', content: 'What is in my index?' };
const answerEvent = {
  ...base,
  id: 'round-1:answer',
  type: 'assistant',
  content: 'It holds logs.',
};

const toolCallEvents = (
  toolCallId: string,
  status: 'successful' | 'failed' | null = 'successful',
  results: ToolResult[] = [okResult]
) => [
  {
    ...base,
    id: `round-1:tool_call:${toolCallId}`,
    type: 'assistant',
    tool_calls: [{ id: toolCallId, name: 'platform.core.search', args: { query: 'logs' } }],
  },
  {
    ...base,
    id: `round-1:tool:${toolCallId}`,
    type: 'tool',
    tool_call_id: toolCallId,
    tool_name: 'platform.core.search',
    result: results,
    status,
  },
];

const withSeq = (events: object[]) => events.map((event, seq) => ({ ...event, seq }));

describe('roundToSessionEvents', () => {
  it('maps a plain round to the user message and the answer', () => {
    expect(roundToSessionEvents(createRound())).toEqual(withSeq([userEvent, answerEvent]));
  });

  it('maps a tool call to an assistant event followed by its tool event', () => {
    const events = roundToSessionEvents(createRound({ steps: [toolCall('call-1')] }));

    expect(events).toEqual(withSeq([userEvent, ...toolCallEvents('call-1'), answerEvent]));
  });

  it('marks a tool call as failed when any of its results is an error', () => {
    const results = [okResult, errorResult];
    const events = roundToSessionEvents(createRound({ steps: [toolCall('call-1', { results })] }));

    expect(events).toEqual(
      withSeq([userEvent, ...toolCallEvents('call-1', 'failed', results), answerEvent])
    );
  });

  it('leaves the status of an interrupted tool call unknown', () => {
    const events = roundToSessionEvents(
      createRound({ steps: [toolCall('call-1', { results: [], interrupted: true })] })
    );

    expect(events).toEqual(
      withSeq([userEvent, ...toolCallEvents('call-1', null, []), answerEvent])
    );
  });

  it('keeps several tool calls in step order', () => {
    const events = roundToSessionEvents(
      createRound({ steps: [toolCall('call-1'), toolCall('call-2'), toolCall('call-3')] })
    );

    expect(events).toEqual(
      withSeq([
        userEvent,
        ...toolCallEvents('call-1'),
        ...toolCallEvents('call-2'),
        ...toolCallEvents('call-3'),
        answerEvent,
      ])
    );
  });

  it('drops values that are not JSON from tool params and results', () => {
    const [, call, result] = roundToSessionEvents(
      createRound({
        steps: [
          toolCall('call-1', {
            params: { query: 'logs', skipped: undefined },
            results: [{ ...okResult, data: { count: 3, skipped: undefined } }],
          }),
        ],
      })
    );

    expect(call).toHaveProperty('tool_calls', [
      { id: 'call-1', name: 'platform.core.search', args: { query: 'logs' } },
    ]);
    expect(result).toHaveProperty('result', [okResult]);
  });

  it('maps a reasoning step and skips transient and empty ones', () => {
    const events = roundToSessionEvents(
      createRound({
        steps: [reasoning('transient thought', true), reasoning(''), reasoning('Check the index')],
      })
    );

    expect(events).toEqual(
      withSeq([
        userEvent,
        { ...base, id: 'round-1:reasoning:2', type: 'reasoning', content: 'Check the index' },
        answerEvent,
      ])
    );
  });

  it('keeps a steered round in the order it happened', () => {
    const events = roundToSessionEvents(
      createRound({
        steps: [
          toolCall('call-1'),
          createInterimAnswerStep({ message: 'So far: three indices.' }),
          steer('event-9', 'Only the logs one', '2026-11-27T10:00:30.000Z'),
          toolCall('call-2'),
        ],
      })
    );

    expect(events).toEqual(
      withSeq([
        userEvent,
        ...toolCallEvents('call-1'),
        {
          ...base,
          id: 'round-1:interim:1',
          type: 'assistant',
          content: 'So far: three indices.',
        },
        {
          turn_id: ROUND_ID,
          id: 'round-1:delivered:event-9',
          type: 'user',
          content: 'Only the logs one',
          event_at: '2026-11-27T10:00:30.000Z',
        },
        ...toolCallEvents('call-2'),
        answerEvent,
      ])
    );
  });

  it('maps two steered messages to two events with their own ids and times', () => {
    const events = roundToSessionEvents(
      createRound({
        steps: [
          steer('event-9', 'Only the logs one', '2026-11-27T10:00:30.000Z'),
          steer('event-10', 'And only today', '2026-11-27T10:00:45.000Z'),
        ],
      })
    );

    expect(events).toEqual(
      withSeq([
        userEvent,
        {
          turn_id: ROUND_ID,
          id: 'round-1:delivered:event-9',
          type: 'user',
          content: 'Only the logs one',
          event_at: '2026-11-27T10:00:30.000Z',
        },
        {
          turn_id: ROUND_ID,
          id: 'round-1:delivered:event-10',
          type: 'user',
          content: 'And only today',
          event_at: '2026-11-27T10:00:45.000Z',
        },
        answerEvent,
      ])
    );
  });

  it('gives every event the round id as turn id, a unique id and a gapless seq', () => {
    const events = roundToSessionEvents(
      createRound({
        steps: [
          reasoning('Check the index'),
          toolCall('call-1'),
          createInterimAnswerStep({ message: 'So far: three indices.' }),
          steer('event-9', 'Only the logs one', '2026-11-27T10:00:30.000Z'),
          toolCall('call-2'),
        ],
      })
    );

    expect(events.map(({ turn_id: turnId }) => turnId)).toEqual(events.map(() => ROUND_ID));
    expect(events.map(({ seq }) => seq)).toEqual(events.map((_, index) => index));
    expect(new Set(events.map(({ id }) => id)).size).toBe(events.length);
  });

  it('produces the same ids when the same round is mapped again', () => {
    const round = createRound({
      steps: [
        toolCall('call-1'),
        steer('event-9', 'Only the logs one', '2026-11-27T10:00:30.000Z'),
      ],
    });

    expect(roundToSessionEvents(round)).toEqual(roundToSessionEvents(round));
  });

  it('emits no user event for an empty input and no answer event for an empty response', () => {
    const events = roundToSessionEvents(
      createRound({
        input: { message: '' },
        steps: [toolCall('call-1')],
        response: { message: '' },
      })
    );

    expect(events).toEqual(withSeq(toolCallEvents('call-1')));
  });

  it('returns no events for a round with nothing to save', () => {
    expect(
      roundToSessionEvents(createRound({ input: { message: '' }, response: { message: '' } }))
    ).toEqual([]);
  });

  it('ignores step types that are not part of the conversation', () => {
    const events = roundToSessionEvents(
      createRound({
        steps: [
          createRelevantSkillsStep({ skills: [], source: 'implicit' }),
          createModelReasoningStep({ reasoning: 'provider thinking' }),
          toolCall('call-1'),
          {
            type: ConversationRoundStepType.compaction,
            summarized_cycle_count: 2,
            token_count_before: 1000,
            token_count_after: 200,
          },
          createAskUserQuestionStep({ prompt_id: 'prompt-1', questions: [] }),
          toolCall('call-2'),
        ],
      })
    );

    expect(events).toEqual(
      withSeq([userEvent, ...toolCallEvents('call-1'), ...toolCallEvents('call-2'), answerEvent])
    );
  });
});
