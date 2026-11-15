/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
  ToolResultType,
  type ConversationEvent,
  type ConversationRound,
  type ConversationRoundStep,
} from '@kbn/agent-builder-common';
import {
  deserializeConversationRounds,
  eventsForRoundsWrite,
  eventsFromRounds,
  isRoundDerivedEventId,
  reconcileEvents,
  roundsForDocument,
  roundsFromEvents,
  roundToEvents,
  serializeConversationRounds,
} from './timeline';

const ctx = { agentId: 'agent-1', username: 'elastic', userId: 'user-1' };
const agent = { type: EventActorType.agent, id: 'agent-1' };
const user = { type: EventActorType.user, id: 'user-1', username: 'elastic' };

const toolCall = (
  toolCallId: string,
  results: unknown[] = [{ tool_result_id: `r-${toolCallId}`, type: ToolResultType.other, data: {} }]
): ConversationRoundStep =>
  ({
    type: ConversationRoundStepType.toolCall,
    tool_call_id: toolCallId,
    tool_id: 'my_tool',
    params: {},
    results,
  } as unknown as ConversationRoundStep);

const reasoning = (text: string): ConversationRoundStep =>
  ({ type: ConversationRoundStepType.reasoning, reasoning: text } as ConversationRoundStep);

const createRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  steps: [],
  response: { message: 'hi there' },
  started_at: '2025-01-01T00:00:00.000Z',
  time_to_first_token: 100,
  time_to_last_token: 500,
  model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 10, output_tokens: 5 },
  ...overrides,
});

const typesOf = (events: ConversationEvent[]) => events.map((event) => event.type);

/**
 * A HITL round as Agent Builder writes it: exec_0 pauses on a confirmation with a pending tool
 * call, a prompt_response answers it, and exec_1 resolves the call and responds.
 */
const hitlEvents = (roundId = 'hitl'): ConversationEvent[] => {
  const exec0 = `${roundId}::execution`;
  const exec1 = `${roundId}::execution::1`;
  const summary = {
    model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 10, output_tokens: 1 },
    time_to_first_token: 10,
    time_to_last_token: 100,
  };
  return [
    {
      id: `${roundId}::user_message`,
      type: TimelineEventType.userMessage,
      created_at: '2025-01-01T00:00:00.000Z',
      actor: user,
      data: { message: 'delete the index', attachment_refs: [{ attachment_id: 'a1', version: 1 }] },
    },
    {
      id: `${roundId}::execution_started`,
      type: TimelineEventType.executionStarted,
      created_at: '2025-01-01T00:00:00.000Z',
      actor: agent,
      execution_id: exec0,
      trigger_event_id: `${roundId}::user_message`,
      data: { trigger_type: 'user_message' },
    },
    {
      id: `${roundId}::step::0`,
      type: TimelineEventType.executionStep,
      created_at: '2025-01-01T00:00:00.000Z',
      actor: agent,
      execution_id: exec0,
      trigger_event_id: `${roundId}::user_message`,
      data: { step: toolCall('call-1', []), sequence: 0 },
    },
    {
      id: `${roundId}::execution_terminated`,
      type: TimelineEventType.executionTerminated,
      created_at: '2025-01-01T00:00:01.000Z',
      actor: agent,
      execution_id: exec0,
      trigger_event_id: `${roundId}::user_message`,
      data: {
        ...summary,
        outcome: { type: 'prompt_requested', prompts: [{ id: 'confirm-1' }] },
      },
    },
    {
      id: `${roundId}::prompt_response::1`,
      type: TimelineEventType.promptResponse,
      created_at: '2025-01-01T00:00:02.000Z',
      actor: user,
      data: {
        prompt_requested_event_id: `${roundId}::execution_terminated`,
        responses: { 'confirm-1': { allow: true } },
      },
    },
    {
      id: `${exec1}::execution_started`,
      type: TimelineEventType.executionStarted,
      created_at: '2025-01-01T00:00:02.000Z',
      actor: agent,
      execution_id: exec1,
      trigger_event_id: `${roundId}::prompt_response::1`,
      data: { trigger_type: 'prompt_response' },
    },
    {
      id: `${exec1}::step::0`,
      type: TimelineEventType.executionStep,
      created_at: '2025-01-01T00:00:02.000Z',
      actor: agent,
      execution_id: exec1,
      trigger_event_id: `${roundId}::prompt_response::1`,
      data: { step: toolCall('call-1'), sequence: 0 },
    },
    {
      id: `${exec1}::step::1`,
      type: TimelineEventType.executionStep,
      created_at: '2025-01-01T00:00:02.000Z',
      actor: agent,
      execution_id: exec1,
      trigger_event_id: `${roundId}::prompt_response::1`,
      data: { step: reasoning('done deleting'), sequence: 1 },
    },
    {
      id: `${exec1}::execution_terminated`,
      type: TimelineEventType.executionTerminated,
      created_at: '2025-01-01T00:00:03.000Z',
      actor: agent,
      execution_id: exec1,
      trigger_event_id: `${roundId}::prompt_response::1`,
      data: { ...summary, outcome: { type: 'responded', response: { message: 'deleted' } } },
    },
  ] as unknown as ConversationEvent[];
};

describe('roundToEvents / roundsFromEvents', () => {
  it('round-trips a completed round, including the full input and the author', () => {
    const round = createRound({
      input: { message: 'hello', attachment_refs: [{ attachment_id: 'a1', version: 2 }] },
      steps: [toolCall('call-1'), reasoning('thinking')],
    });

    const [rebuilt] = roundsFromEvents(eventsFromRounds([round], ctx));

    expect(rebuilt).toEqual({
      ...round,
      author: { id: 'user-1', username: 'elastic' },
    });
  });

  it('writes the round input verbatim on the user_message event', () => {
    const input = { message: 'hi', attachment_refs: [{ attachment_id: 'a1', version: 1 }] };
    const [userMessage] = roundToEvents(createRound({ input }), ctx);
    expect(userMessage).toMatchObject({ type: TimelineEventType.userMessage, data: input });
  });

  it('keeps tool call results as objects, never JSON strings', () => {
    const [rebuilt] = roundsFromEvents(
      eventsFromRounds([createRound({ steps: [toolCall('c')] })], ctx)
    );
    expect(typeof (rebuilt.steps[0] as { results: unknown }).results).not.toBe('string');
  });

  it('orders steps by sequence even when events are stored out of order', () => {
    const round = createRound({ steps: [toolCall('a'), toolCall('b'), toolCall('c')] });
    const events = eventsFromRounds([round], ctx);
    const shuffled = [events[4], events[1], events[3], events[0], events[2], events[5]];

    const [rebuilt] = roundsFromEvents(shuffled);

    expect(rebuilt.steps.map((step) => (step as { tool_call_id: string }).tool_call_id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('returns rounds in round-start order regardless of event order', () => {
    const later = createRound({ id: 'late', started_at: '2025-01-02T00:00:00.000Z' });
    const earlier = createRound({ id: 'early', started_at: '2025-01-01T00:00:00.000Z' });

    const rounds = roundsFromEvents(eventsFromRounds([later, earlier], ctx));

    expect(rounds.map((round) => round.id)).toEqual(['early', 'late']);
  });

  describe('status-aware projection', () => {
    it('emits a responded terminal for a completed round', () => {
      const events = roundToEvents(createRound(), ctx);
      expect(events[events.length - 1]).toMatchObject({
        type: TimelineEventType.executionTerminated,
        data: { outcome: { type: 'responded', response: { message: 'hi there' } } },
      });
    });

    it('emits no terminal for an in-progress round, and the fold does not surface it', () => {
      const round = createRound({ status: ConversationRoundStatus.inProgress });
      const events = roundToEvents(round, ctx);

      expect(typesOf(events)).toEqual([
        TimelineEventType.userMessage,
        TimelineEventType.executionStarted,
      ]);
      expect(roundsFromEvents(events)).toEqual([]);
    });

    it('emits a prompt_requested terminal for an awaiting-prompt round and folds it back', () => {
      const pending = [{ id: 'confirm-1' }] as unknown as ConversationRound['pending_prompts'];
      const round = createRound({
        status: ConversationRoundStatus.awaitingPrompt,
        pending_prompts: pending,
        response: { message: '' },
      });

      const events = roundToEvents(round, ctx);
      expect(events[events.length - 1]).toMatchObject({
        type: TimelineEventType.executionTerminated,
        data: { outcome: { type: 'prompt_requested', prompts: pending } },
      });

      const [rebuilt] = roundsFromEvents(events);
      expect(rebuilt.status).toBe(ConversationRoundStatus.awaitingPrompt);
      expect(rebuilt.pending_prompts).toEqual(pending);
    });

    it('emits an execution_failed terminal for an interrupted round and folds it back', () => {
      const interruption = {
        type: 'failed' as const,
        error: { code: 'internalError', message: 'boom' },
      } as unknown as ConversationRound['interruption'];
      const round = createRound({ interruption, response: { message: '' } });

      const events = roundToEvents(round, ctx);
      expect(events[events.length - 1].type).toBe(TimelineEventType.executionFailed);

      const [rebuilt] = roundsFromEvents(events);
      expect(rebuilt.status).toBe(ConversationRoundStatus.completed);
      expect(rebuilt.interruption).toEqual(interruption);
    });
  });

  describe('HITL resumes', () => {
    it('folds a resumed round into a single round with merged steps and the final response', () => {
      const rounds = roundsFromEvents(hitlEvents());

      expect(rounds).toHaveLength(1);
      const [round] = rounds;
      expect(round.id).toBe('hitl');
      expect(round.status).toBe(ConversationRoundStatus.completed);
      expect(round.pending_prompts).toBeUndefined();
      expect(round.response).toEqual({ message: 'deleted' });
      expect(round.input).toEqual({
        message: 'delete the index',
        attachment_refs: [{ attachment_id: 'a1', version: 1 }],
      });
      // The pending call is filled in place with the resume's result, not duplicated.
      expect(round.steps).toHaveLength(2);
      expect(round.steps[0]).toMatchObject({ tool_call_id: 'call-1' });
      expect((round.steps[0] as { results: unknown[] }).results).toHaveLength(1);
      expect(round.steps[1]).toMatchObject({ reasoning: 'done deleting' });
      expect(round.model_usage.llm_calls).toBe(2);
      expect(round.time_to_last_token).toBe(200);
    });

    it('surfaces an unanswered pause as awaiting_prompt', () => {
      const paused = hitlEvents().slice(0, 4);
      const [round] = roundsFromEvents(paused);
      expect(round.status).toBe(ConversationRoundStatus.awaitingPrompt);
      expect(round.pending_prompts).toEqual([{ id: 'confirm-1' }]);
    });

    it('keeps the paused round, without pending prompts, while its resume is still running', () => {
      const resumeRunning = hitlEvents().filter(
        (event) => event.id !== 'hitl::execution::1::execution_terminated'
      );
      const rounds = roundsFromEvents(resumeRunning);
      expect(rounds).toHaveLength(1);
      expect(rounds[0].status).toBe(ConversationRoundStatus.completed);
      expect(rounds[0].pending_prompts).toBeUndefined();
    });

    it('ignores an orphan resume whose initial execution is missing', () => {
      const orphan = hitlEvents().filter((event) => !event.id.startsWith('hitl::execution_'));
      const withoutInitial = orphan.filter((event) => event.execution_id !== 'hitl::execution');
      expect(roundsFromEvents(withoutInitial)).toEqual([]);
    });
  });
});

describe('serializeConversationRounds / deserializeConversationRounds', () => {
  it('serializes tool call results to JSON strings and back', () => {
    const round = createRound({ steps: [toolCall('c')] });
    const [serialized] = serializeConversationRounds([round]);
    expect(typeof (serialized.steps[0] as { results: unknown }).results).toBe('string');
    expect(deserializeConversationRounds([serialized])).toEqual([round]);
  });

  it('leaves already-deserialized results untouched', () => {
    const round = createRound({ steps: [toolCall('c')] });
    expect(deserializeConversationRounds([round])).toEqual([round]);
  });
});

describe('roundsForDocument', () => {
  it('returns the stored rounds (deserialized) for a legacy document, even with events present', () => {
    const stored = serializeConversationRounds([createRound({ steps: [toolCall('c')] })]);
    const staleEvents = eventsFromRounds([createRound({ id: 'a' }), createRound({ id: 'b' })], ctx);

    const rounds = roundsForDocument({
      schemaVersion: undefined,
      storedRounds: stored,
      events: staleEvents,
    });

    expect(rounds.map((round) => round.id)).toEqual(['round-1']);
    expect(typeof (rounds[0].steps[0] as { results: unknown }).results).not.toBe('string');
  });

  it('folds events for an events-native document, even when stored rounds lag behind', () => {
    const rounds = roundsForDocument({
      schemaVersion: 1,
      storedRounds: serializeConversationRounds([createRound({ id: 'hitl' })]),
      events: hitlEvents(),
    });
    expect(rounds).toHaveLength(1);
    expect(rounds[0].response).toEqual({ message: 'deleted' });
  });

  it('falls back to stored rounds for an events-native document without events', () => {
    const round = createRound();
    expect(roundsForDocument({ schemaVersion: 1, storedRounds: [round], events: [] })).toEqual([
      round,
    ]);
  });
});

describe('reconcileEvents', () => {
  const additiveEvent: ConversationEvent = {
    id: '8e0e9c1c-custom',
    type: 'custom_note',
    created_at: '2025-01-01T12:00:00.000Z',
    actor: user,
    data: { note: 'hello' },
  };

  it('recognises round-derived ids and leaves additive ids alone', () => {
    expect(isRoundDerivedEventId('r::user_message')).toBe(true);
    expect(isRoundDerivedEventId('r::execution::1::step::3')).toBe(true);
    expect(isRoundDerivedEventId('r::prompt_response::1')).toBe(true);
    expect(isRoundDerivedEventId(additiveEvent.id)).toBe(false);
  });

  it('keeps additive events, re-inserted by created_at', () => {
    const early = createRound({ id: 'early', started_at: '2025-01-01T00:00:00.000Z' });
    const late = createRound({ id: 'late', started_at: '2025-01-02T00:00:00.000Z' });
    const storedEvents = [...eventsFromRounds([early, late], ctx), additiveEvent];

    const events = reconcileEvents({
      storedEvents,
      rounds: [early, late],
      visibleRoundIds: new Set(['early', 'late']),
      ctx,
    });

    const index = events.findIndex((event) => event.id === additiveEvent.id);
    expect(index).toBeGreaterThan(-1);
    expect(events[index - 1].id).toBe('early::execution_terminated');
    expect(events[index + 1].id).toBe('late::user_message');
  });

  it('keeps a stored HITL block untouched when the caller submits its flat round', () => {
    const storedEvents = hitlEvents();
    const [flat] = roundsFromEvents(storedEvents);

    const events = reconcileEvents({
      storedEvents,
      rounds: [{ ...flat, response: { message: 'edited by RAMEN' } }],
      visibleRoundIds: new Set(['hitl']),
      ctx,
    });

    expect(events).toEqual(storedEvents);
  });

  it('regenerates a single-execution round from the submitted copy', () => {
    const round = createRound();
    const events = reconcileEvents({
      storedEvents: eventsFromRounds([round], ctx),
      rounds: [{ ...round, response: { message: 'updated' } }],
      visibleRoundIds: new Set([round.id]),
      ctx,
    });
    expect(roundsFromEvents(events)[0].response).toEqual({ message: 'updated' });
  });

  it('does not regress a terminated round to in-progress', () => {
    const round = createRound();
    const storedEvents = eventsFromRounds([round], ctx);
    const events = reconcileEvents({
      storedEvents,
      rounds: [{ ...round, status: ConversationRoundStatus.inProgress }],
      visibleRoundIds: new Set([round.id]),
      ctx,
    });
    expect(events).toEqual(storedEvents);
  });

  it('drops a round the caller saw and removed', () => {
    const keep = createRound({ id: 'keep' });
    const removed = createRound({ id: 'removed', started_at: '2025-01-02T00:00:00.000Z' });
    const events = reconcileEvents({
      storedEvents: eventsFromRounds([keep, removed], ctx),
      rounds: [keep],
      visibleRoundIds: new Set(['keep', 'removed']),
      ctx,
    });
    expect(roundsFromEvents(events).map((round) => round.id)).toEqual(['keep']);
    expect(events.some((event) => event.id.startsWith('removed::'))).toBe(false);
  });

  it('keeps an in-progress block the caller never saw', () => {
    const done = createRound({ id: 'done' });
    const running = createRound({ id: 'running', status: ConversationRoundStatus.inProgress });
    const storedEvents = eventsFromRounds([done, running], ctx);

    const events = reconcileEvents({
      storedEvents,
      rounds: [done],
      visibleRoundIds: new Set(['done']),
      ctx,
    });

    expect(events.filter((event) => event.id.startsWith('running::'))).toHaveLength(2);
  });

  it('appends rounds that have no stored block yet', () => {
    const existing = createRound({ id: 'existing' });
    const added = createRound({ id: 'added', started_at: '2025-01-03T00:00:00.000Z' });
    const events = reconcileEvents({
      storedEvents: eventsFromRounds([existing], ctx),
      rounds: [existing, added],
      visibleRoundIds: new Set(['existing']),
      ctx,
    });
    expect(roundsFromEvents(events).map((round) => round.id)).toEqual(['existing', 'added']);
  });
});

describe('eventsForRoundsWrite', () => {
  it('projects from scratch for a legacy document', () => {
    const round = createRound();
    const events = eventsForRoundsWrite({
      schemaVersion: undefined,
      storedRounds: [round],
      storedEvents: [
        {
          id: 'x',
          type: 'custom_note',
          created_at: '2025-01-01T00:00:00.000Z',
          actor: user,
          data: {},
        },
      ],
      rounds: [round],
      ctx,
    });
    expect(events).toEqual(eventsFromRounds([round], ctx));
  });

  it('reconciles against the stored timeline for an events-native document', () => {
    const storedEvents = hitlEvents();
    const [flat] = roundsFromEvents(storedEvents);
    const added = createRound({ id: 'next', started_at: '2025-01-05T00:00:00.000Z' });

    const events = eventsForRoundsWrite({
      schemaVersion: 1,
      storedRounds: [],
      storedEvents,
      rounds: [flat, added],
      ctx,
    });

    expect(events.slice(0, storedEvents.length)).toEqual(storedEvents);
    expect(roundsFromEvents(events).map((round) => round.id)).toEqual(['hitl', 'next']);
  });
});
