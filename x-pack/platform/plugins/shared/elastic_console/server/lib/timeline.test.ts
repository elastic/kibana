/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolResultType,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import {
  deserializeConversationRounds,
  eventsFromRounds,
  hydrateRounds,
  roundsFromEvents,
  serializeConversationRounds,
} from './timeline';

const ctx = { agentId: 'agent-1', username: 'elastic', userId: 'user-1' };

const createRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  steps: [],
  response: { message: 'hi there' },
  started_at: '2025-01-01T00:00:00.000Z',
  time_to_first_token: 100,
  time_to_last_token: 500,
  model_usage: { connector_id: 'elastic-ramen', llm_calls: 1, input_tokens: 10, output_tokens: 5 },
  ...overrides,
});

const createToolCallStep = (
  overrides: Partial<{ tool_call_id: string; results: unknown }> = {}
): ConversationRound['steps'][number] =>
  ({
    type: ConversationRoundStepType.toolCall,
    tool_call_id: overrides.tool_call_id ?? 'call-1',
    tool_id: 'my_tool',
    params: {},
    results: overrides.results ?? [
      { tool_result_id: 'result-1', type: ToolResultType.other, data: { foo: 'bar' } },
    ],
  } as unknown as ConversationRound['steps'][number]);

describe('eventsFromRounds / roundsFromEvents round trip', () => {
  it('reconstructs a round with steps from the generated events', () => {
    const round = createRound({
      steps: [createToolCallStep()],
    });

    const events = eventsFromRounds([round], ctx);
    const [rebuilt] = roundsFromEvents(events);

    expect(rebuilt.id).toBe(round.id);
    expect(rebuilt.input.message).toBe('hello');
    expect(rebuilt.response.message).toBe('hi there');
    expect(rebuilt.steps).toHaveLength(1);
    expect(rebuilt.steps[0]).toMatchObject({ tool_call_id: 'call-1' });
  });

  it('preserves tool call step results as objects, not JSON strings, through the round trip', () => {
    const round = createRound({
      steps: [createToolCallStep()],
    });

    const events = eventsFromRounds([round], ctx);
    const [rebuilt] = roundsFromEvents(events);
    const [step] = rebuilt.steps as Array<{ results: unknown }>;

    expect(typeof step.results).not.toBe('string');
    expect(step.results).toEqual([
      { tool_result_id: 'result-1', type: ToolResultType.other, data: { foo: 'bar' } },
    ]);
  });

  it('preserves step order via the explicit sequence carried on each execution_step event', () => {
    const steps = [
      createToolCallStep({ tool_call_id: 'call-1' }),
      createToolCallStep({ tool_call_id: 'call-2' }),
      createToolCallStep({ tool_call_id: 'call-3' }),
    ];
    const round = createRound({ steps });

    const events = eventsFromRounds([round], ctx);
    expect(events).toHaveLength(6); // user_message, execution_started, 3 steps, execution_terminated
    // Simulate events arriving/being stored out of order (e.g. a resync): shuffle them, keeping
    // every event so only the ordering (not the membership) of the group changes.
    const shuffled = [events[4], events[1], events[3], events[0], events[2], events[5]];
    const [rebuilt] = roundsFromEvents(shuffled);

    expect((rebuilt.steps as Array<{ tool_call_id: string }>).map((s) => s.tool_call_id)).toEqual([
      'call-1',
      'call-2',
      'call-3',
    ]);
  });

  it('returns rounds sorted by started_at regardless of event/group iteration order', () => {
    const earlier = createRound({ id: 'round-early', started_at: '2025-01-01T00:00:00.000Z' });
    const later = createRound({ id: 'round-late', started_at: '2025-01-02T00:00:00.000Z' });

    // Build events for `later` first, so naive Map insertion order would put it first.
    const events = [...eventsFromRounds([later], ctx), ...eventsFromRounds([earlier], ctx)];

    const rounds = roundsFromEvents(events);

    expect(rounds.map((r) => r.id)).toEqual(['round-early', 'round-late']);
  });

  it('ignores executions with no terminal event (in-progress rounds)', () => {
    const round = createRound();
    const events = eventsFromRounds([round], ctx).filter(
      (event) => event.type !== 'execution_terminated'
    );

    expect(roundsFromEvents(events)).toEqual([]);
  });
});

describe('serializeConversationRounds / deserializeConversationRounds', () => {
  it('serializes tool call results to a JSON string', () => {
    const round = createRound({
      steps: [createToolCallStep()],
    });

    const [serialized] = serializeConversationRounds([round]);
    const [step] = serialized.steps as Array<{ results: unknown }>;

    expect(typeof step.results).toBe('string');
    expect(JSON.parse(step.results as string)).toEqual([
      { tool_result_id: 'result-1', type: ToolResultType.other, data: { foo: 'bar' } },
    ]);
  });

  it('is undone by deserializeConversationRounds', () => {
    const round = createRound({
      steps: [createToolCallStep()],
    });

    const serialized = serializeConversationRounds([round]);
    const [deserialized] = deserializeConversationRounds(serialized);
    const [step] = deserialized.steps as Array<{ results: unknown }>;

    expect(typeof step.results).not.toBe('string');
    expect(step.results).toEqual([
      { tool_result_id: 'result-1', type: ToolResultType.other, data: { foo: 'bar' } },
    ]);
  });

  it('leaves non-tool-call steps and already-deserialized results untouched', () => {
    const round = createRound({
      steps: [createToolCallStep()],
    });

    expect(deserializeConversationRounds([round])).toEqual([round]);
  });
});

describe('hydrateRounds', () => {
  it('returns object (not stringified) tool call results whether it picks the stored or the folded rounds', () => {
    const round = createRound({
      steps: [createToolCallStep()],
    });
    const storedSerialized = serializeConversationRounds([round]);
    const events = eventsFromRounds([round], ctx);

    // `stored` wins: same length as `folded`, so `hydrateRounds` returns the stored branch.
    const fromStored = hydrateRounds(storedSerialized, events);
    // `folded` wins: no stored rounds at all.
    const fromFolded = hydrateRounds(undefined, events);

    const storedStep = fromStored[0].steps[0] as { results: unknown };
    const foldedStep = fromFolded[0].steps[0] as { results: unknown };

    expect(typeof storedStep.results).not.toBe('string');
    expect(typeof foldedStep.results).not.toBe('string');
    expect(storedStep.results).toEqual(foldedStep.results);
  });

  it('prefers the folded rounds when they contain more rounds than what is stored', () => {
    const round = createRound();
    const events = eventsFromRounds([round], ctx);

    expect(hydrateRounds([], events)).toHaveLength(1);
  });

  it('prefers the stored rounds when nothing is stored and no events exist either', () => {
    expect(hydrateRounds(undefined, undefined)).toEqual([]);
  });
});
