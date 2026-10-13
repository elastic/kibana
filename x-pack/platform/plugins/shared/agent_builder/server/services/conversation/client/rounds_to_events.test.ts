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
  ExecutionAbortedEvent,
  ExecutionFailedEvent,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import type { PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import {
  ConversationOriginType,
  ConversationRoundStatus,
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
  executionTerminatedEventId,
  parseExecutionId,
  resumeExecutionId,
} from '@kbn/agent-builder-common';
import {
  agentActor,
  executionStartedEvent,
  interruptedExecutionToEvents,
  lastTerminatedExecutionIndex,
  nextResumeIndex,
  resumeExecutionStartedEvent,
  isRoundDerivedEventId,
  roundsToEvents,
  userMessageEvent,
} from './rounds_to_events';

const baseRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  steps: [],
  response: { message: 'hi there' },
  started_at: '2026-01-01T00:00:00.000Z',
  time_to_first_token: 10,
  time_to_last_token: 20,
  model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 5, output_tokens: 7 },
  ...overrides,
});

const baseConversation = (rounds: ConversationRound[]): Conversation => ({
  id: 'conv-1',
  agent_id: 'agent-1',
  user: { id: 'user-1', username: 'alice' },
  title: 'T',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  rounds,
});

describe('roundsToEvents', () => {
  it('maps a completed round to user_message + execution_started + execution_terminated(responded)', () => {
    const events = roundsToEvents(baseConversation([baseRound()]));

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      id: 'round-1::user_message',
      type: TimelineEventType.userMessage,
      actor: { type: EventActorType.user, id: 'user-1', username: 'alice' },
      data: { message: 'hello' },
    });
    expect(events[1]).toMatchObject({
      id: 'round-1::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: '2026-01-01T00:00:00.000Z',
      execution_id: 'round-1::execution',
      trigger_event_id: 'round-1::user_message',
      actor: { type: EventActorType.agent, id: 'agent-1' },
    });
    expect(events[2]).toMatchObject({
      id: 'round-1::execution_terminated',
      type: TimelineEventType.executionTerminated,
      // started_at (00.000Z) + time_to_last_token (20ms), not the same instant as the start.
      created_at: '2026-01-01T00:00:00.020Z',
      execution_id: 'round-1::execution',
      trigger_event_id: 'round-1::user_message',
      actor: { type: EventActorType.agent, id: 'agent-1' },
      data: {
        model_usage: { input_tokens: 5, output_tokens: 7 },
        time_to_first_token: 10,
        time_to_last_token: 20,
        outcome: { type: 'responded', response: { message: 'hi there' } },
      },
    });
  });

  it('emits only user_message + execution_started for an in-progress round (no terminal)', () => {
    const events = roundsToEvents(
      baseConversation([baseRound({ status: ConversationRoundStatus.inProgress })])
    );

    expect(events.map((e) => e.type)).toEqual([
      TimelineEventType.userMessage,
      TimelineEventType.executionStarted,
    ]);
  });

  it('maps an awaiting-prompt round to user_message + execution_started + execution_terminated(prompt_requested)', () => {
    const prompts = [{ id: 'p1' }] as unknown as PromptRequest[];
    const events = roundsToEvents(
      baseConversation([
        baseRound({ status: ConversationRoundStatus.awaitingPrompt, pending_prompts: prompts }),
      ])
    );

    expect(events).toHaveLength(3);
    expect(events[1]).toMatchObject({
      id: 'round-1::execution_started',
      type: TimelineEventType.executionStarted,
    });
    expect(events[2]).toMatchObject({
      id: 'round-1::execution_terminated',
      type: TimelineEventType.executionTerminated,
      trigger_event_id: 'round-1::user_message',
      // The paused terminal carries the run summary; the prompts live on the outcome.
      data: {
        model_usage: { input_tokens: 5, output_tokens: 7 },
        time_to_first_token: 10,
        time_to_last_token: 20,
        outcome: { type: 'prompt_requested', prompts },
      },
    });
  });

  it('uses the round author (external origin) as the user_message actor', () => {
    const events = roundsToEvents(
      baseConversation([
        baseRound({
          author: { id: 'slack-U123', username: 'bob' },
          origin: { type: ConversationOriginType.Slack },
        }),
      ])
    );

    expect(events[0].actor).toEqual({
      type: EventActorType.external,
      id: 'slack-U123',
      username: 'bob',
      origin: { type: ConversationOriginType.Slack },
    });
  });

  it('marks an authorless round that has an origin as an external actor carrying the origin', () => {
    const events = roundsToEvents(
      baseConversation([baseRound({ origin: { type: ConversationOriginType.Slack } })])
    );

    expect(events[0].actor).toEqual({
      type: EventActorType.external,
      id: 'user-1',
      username: 'alice',
      origin: { type: ConversationOriginType.Slack },
    });
  });

  it('produces deterministic ids across calls, in round order', () => {
    const conversation = baseConversation([baseRound(), baseRound({ id: 'round-2' })]);

    const first = roundsToEvents(conversation).map((e) => e.id);
    const second = roundsToEvents(conversation).map((e) => e.id);

    expect(first).toEqual(second);
    expect(first).toEqual([
      'round-1::user_message',
      'round-1::execution_started',
      'round-1::execution_terminated',
      'round-2::user_message',
      'round-2::execution_started',
      'round-2::execution_terminated',
    ]);
  });

  it('emits one execution_step per round.steps entry, indexed by sequence, between start and terminated', () => {
    const steps: ConversationRoundStep[] = [
      {
        type: ConversationRoundStepType.reasoning,
        reasoning: 'thinking',
      } as ConversationRoundStep,
      {
        type: ConversationRoundStepType.toolCall,
        tool_call_id: 'tc-1',
        tool_id: 'platform.core.search',
        params: { q: 'foo' },
        results: [],
      } as ConversationRoundStep,
    ];

    const events = roundsToEvents(baseConversation([baseRound({ steps })]));

    // Boundary events sandwich two step events in `sequence` order.
    expect(events.map((event) => event.type)).toEqual([
      TimelineEventType.userMessage,
      TimelineEventType.executionStarted,
      TimelineEventType.executionStep,
      TimelineEventType.executionStep,
      TimelineEventType.executionTerminated,
    ]);
    expect(events.map((event) => event.id)).toEqual([
      'round-1::user_message',
      'round-1::execution_started',
      'round-1::step::0',
      'round-1::step::1',
      'round-1::execution_terminated',
    ]);

    // Step events carry the exact step payload from round.steps + a matching sequence.
    expect(events[2]).toMatchObject({
      type: TimelineEventType.executionStep,
      created_at: '2026-01-01T00:00:00.000Z',
      execution_id: 'round-1::execution',
      trigger_event_id: 'round-1::user_message',
      actor: { type: EventActorType.agent, id: 'agent-1' },
      data: { step: steps[0], sequence: 0 },
    });
    expect(events[3]).toMatchObject({
      type: TimelineEventType.executionStep,
      data: { step: steps[1], sequence: 1 },
    });

    expect(events[4]).toMatchObject({ type: TimelineEventType.executionTerminated });
    const terminatedData = events[4].data as { steps?: unknown };
    expect(terminatedData.steps).toBeUndefined();
  });
});

describe('userMessageEvent (split builder)', () => {
  it('produces exactly one user_message event with the round input and actor', () => {
    const round = baseRound();
    const conversation = baseConversation([round]);
    const event = userMessageEvent(
      {
        id: `${round.id}::user_message`,
        createdAt: round.started_at,
        input: round.input,
        author: round.author,
      },
      conversation
    );

    expect(event).toMatchObject({
      id: 'round-1::user_message',
      type: TimelineEventType.userMessage,
      created_at: round.started_at,
      actor: { type: EventActorType.user, id: 'user-1', username: 'alice' },
      data: { message: 'hello' },
    });
    // No `execution_id` / `trigger_event_id` fields belong on the user_message.
    expect(event).not.toHaveProperty('execution_id');
    expect(event).not.toHaveProperty('trigger_event_id');
  });
});

describe('executionStartedEvent (split builder)', () => {
  it('produces exactly one execution_started event that references the round input event', () => {
    const round = baseRound();
    const conversation = baseConversation([round]);
    const event = executionStartedEvent(round, conversation);

    expect(event).toMatchObject({
      id: 'round-1::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: round.started_at,
      actor: { type: EventActorType.agent, id: 'agent-1' },
      execution_id: 'round-1::execution',
      trigger_event_id: 'round-1::user_message',
    });
  });
});

describe('isRoundDerivedEventId', () => {
  it.each(
    roundsToEvents(
      baseConversation([
        baseRound({
          steps: [
            { type: ConversationRoundStepType.reasoning, reasoning: 'r' } as ConversationRoundStep,
          ],
        }),
      ])
    ).map((event) => event.id as string)
  )('recognizes round-derived id %p', (id) => {
    expect(isRoundDerivedEventId(id)).toBe(true);
  });

  it('recognizes step ids at arbitrary sequences (the `::step::N` marker is a prefix, not a suffix)', () => {
    expect(isRoundDerivedEventId('round-1::step::0')).toBe(true);
    expect(isRoundDerivedEventId('round-42::step::12')).toBe(true);
  });

  it('recognizes the terminal ids of interrupted executions (initial and resume)', () => {
    expect(isRoundDerivedEventId('round-1::execution_failed')).toBe(true);
    expect(isRoundDerivedEventId('round-1::execution_aborted')).toBe(true);
    expect(isRoundDerivedEventId('round-1::execution::3::execution_failed')).toBe(true);
    expect(isRoundDerivedEventId('round-1::execution::3::execution_aborted')).toBe(true);
  });

  it('rejects ids that are not round-derived', () => {
    expect(isRoundDerivedEventId('some-additive-error')).toBe(false);
    expect(isRoundDerivedEventId('::user_message::follow-up')).toBe(false);
    expect(isRoundDerivedEventId('')).toBe(false);
  });

  it('rejects additive ids that merely contain the step marker (check is anchored to ::step::N$)', () => {
    expect(isRoundDerivedEventId('my-error::step::context')).toBe(false);
    expect(isRoundDerivedEventId('round-1::step::0::retry')).toBe(false);
    expect(isRoundDerivedEventId('round-1::step::')).toBe(false);
  });
});

describe('parseExecutionId', () => {
  it.each([1, 2, 10])('parses resume %i', (index) => {
    expect(parseExecutionId(resumeExecutionId('round::nested', index))).toEqual({
      roundId: 'round::nested',
      index,
    });
  });

  it('parses an initial execution', () => {
    expect(parseExecutionId('round::execution')).toEqual({ roundId: 'round', index: 0 });
  });

  it.each(['round', 'round::execution::bad', 'round::execution::1::step::0'])(
    'rejects unrelated id %s',
    (id) => expect(parseExecutionId(id)).toBeUndefined()
  );
});

describe('resumeExecutionStartedEvent', () => {
  it('produces an execution_started event scoped to the resume execution', () => {
    const conversation = baseConversation([baseRound()]);
    const event = resumeExecutionStartedEvent({
      roundId: 'round-1',
      executionIndex: 2,
      startedAt: '2026-01-02T00:00:00.000Z',
      triggerEventId: 'round-1::prompt_response::2',
      conversation,
    });

    expect(event).toMatchObject({
      id: 'round-1::execution::2::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: '2026-01-02T00:00:00.000Z',
      actor: { type: EventActorType.agent, id: 'agent-1' },
      execution_id: 'round-1::execution::2',
      trigger_event_id: 'round-1::prompt_response::2',
    });
  });
});

describe('nextResumeIndex', () => {
  it('returns 0 when the conversation has no events', () => {
    expect(nextResumeIndex({ events: undefined }, 'round-1')).toBe(0);
    expect(nextResumeIndex({ events: [] }, 'round-1')).toBe(0);
  });

  it('counts distinct executions for the target round only', () => {
    const events = [
      { execution_id: 'round-1::execution' },
      { execution_id: 'round-1::execution' },
      { execution_id: 'round-1::execution::1' },
      { execution_id: 'round-2::execution' },
    ] as never;
    expect(nextResumeIndex({ events }, 'round-1')).toBe(2);
    expect(nextResumeIndex({ events }, 'round-2')).toBe(1);
    expect(nextResumeIndex({ events }, 'round-3')).toBe(0);
  });

  it('ignores events without an execution_id', () => {
    const events = [{ id: 'x' }, { execution_id: 'round-1::execution' }] as never;
    expect(nextResumeIndex({ events }, 'round-1')).toBe(1);
  });
});

describe('interruptedExecutionToEvents', () => {
  const conversation = baseConversation([]);
  const T0 = '2024-01-01T00:00:00.000Z';
  const usage = { connector_id: 'c', llm_calls: 1, input_tokens: 1, output_tokens: 1 };
  const reasoningStep = {
    type: ConversationRoundStepType.reasoning,
    reasoning: 'thinking',
  } as ConversationRoundStep;

  it('projects a failed initial execution: started, steps, one execution_failed', () => {
    const events = interruptedExecutionToEvents({
      roundId: 'r1',
      executionIndex: 0,
      startedAt: T0,
      triggerEventId: 'r1::user_message',
      steps: [reasoningStep],
      summary: { time_to_last_token: 1500, model_usage: usage },
      interruption: { type: 'failed', error: { code: 'internalError', message: 'boom' } as never },
      conversation,
    });

    expect(events.map((e) => [e.id, e.type, e.execution_id, e.trigger_event_id])).toEqual([
      ['r1::execution_started', 'execution_started', 'r1::execution', 'r1::user_message'],
      ['r1::step::0', 'execution_step', 'r1::execution', 'r1::user_message'],
      ['r1::execution_failed', 'execution_failed', 'r1::execution', 'r1::user_message'],
    ]);
    expect(events[1].data).toEqual({ step: reasoningStep, sequence: 0 });
    const terminal = events[2] as ExecutionFailedEvent;
    expect(terminal.created_at).toBe('2024-01-01T00:00:01.500Z');
    expect(terminal.actor).toEqual(agentActor(conversation));
    expect(terminal.data).toEqual({
      time_to_last_token: 1500,
      model_usage: usage,
      error: { code: 'internalError', message: 'boom' },
    });
  });

  it('projects an aborted resume execution under exec_k ids', () => {
    const events = interruptedExecutionToEvents({
      roundId: 'r1',
      executionIndex: 2,
      startedAt: T0,
      triggerEventId: 'r1::prompt_response::2',
      steps: [],
      summary: { time_to_last_token: 10 },
      interruption: { type: 'aborted' },
      conversation,
    });

    expect(events.map((e) => [e.id, e.type, e.execution_id, e.trigger_event_id])).toEqual([
      [
        'r1::execution::2::execution_started',
        'execution_started',
        'r1::execution::2',
        'r1::prompt_response::2',
      ],
      [
        'r1::execution::2::execution_aborted',
        'execution_aborted',
        'r1::execution::2',
        'r1::prompt_response::2',
      ],
    ]);
    expect(events[0].data).toEqual({ trigger_type: TimelineTriggerType.promptResponse });
    expect((events[1] as ExecutionAbortedEvent).data).toEqual({ time_to_last_token: 10 });
  });

  it('carries aborted_by on the aborted terminal when the interruption records it', () => {
    const abortedBy = { source: 'task_manager' as const };
    const [, terminal] = interruptedExecutionToEvents({
      roundId: 'r1',
      executionIndex: 0,
      startedAt: T0,
      triggerEventId: 'r1::user_message',
      steps: [],
      summary: { time_to_last_token: 10 },
      interruption: { type: 'aborted', aborted_by: abortedBy },
      conversation,
    });
    expect(terminal.data).toEqual({ time_to_last_token: 10, aborted_by: abortedBy });
  });

  it('numbers resume steps under the execution id', () => {
    const events = interruptedExecutionToEvents({
      roundId: 'r1',
      executionIndex: 1,
      startedAt: T0,
      triggerEventId: 'r1::prompt_response::1',
      steps: [reasoningStep, reasoningStep],
      summary: { time_to_last_token: 10 },
      interruption: { type: 'aborted' },
      conversation,
    });

    expect(events.slice(1, 3).map((e) => e.id)).toEqual([
      'r1::execution::1::step::0',
      'r1::execution::1::step::1',
    ]);
  });

  it('never carries steps in the terminal payload', () => {
    const [, , terminal] = interruptedExecutionToEvents({
      roundId: 'r1',
      executionIndex: 0,
      startedAt: T0,
      triggerEventId: 'r1::user_message',
      steps: [reasoningStep],
      summary: { time_to_last_token: 1 },
      interruption: { type: 'aborted' },
      conversation,
    });
    expect(terminal.data).not.toHaveProperty('steps');
  });
});

describe('lastTerminatedExecutionIndex', () => {
  const conversation = baseConversation([]);
  const lifecycle = (executionId: string, type: TimelineEventType, id: string): TimelineEvent =>
    ({
      id,
      type,
      created_at: '2024-01-01T00:00:00.000Z',
      actor: agentActor(conversation),
      execution_id: executionId,
      trigger_event_id: 'r1::user_message',
      data: {},
    } as unknown as TimelineEvent);

  it('returns the index of the last execution_terminated of the round, skipping interrupted ones', () => {
    const events = [
      lifecycle('r1::execution', TimelineEventType.executionTerminated, 'r1::execution_terminated'),
      lifecycle(
        'r1::execution::1',
        TimelineEventType.executionAborted,
        'r1::execution::1::execution_aborted'
      ),
      lifecycle(
        'r1::execution::2',
        TimelineEventType.executionFailed,
        'r1::execution::2::execution_failed'
      ),
      // another round's terminated must not count
      lifecycle(
        'r2::execution::5',
        TimelineEventType.executionTerminated,
        'r2::execution::5::execution_terminated'
      ),
    ];
    expect(lastTerminatedExecutionIndex({ events }, 'r1')).toBe(0);
  });

  it('returns the highest terminated index when several executions terminated', () => {
    const events = [
      lifecycle('r1::execution', TimelineEventType.executionTerminated, 'r1::execution_terminated'),
      lifecycle(
        'r1::execution::1',
        TimelineEventType.executionTerminated,
        'r1::execution::1::execution_terminated'
      ),
      lifecycle(
        'r1::execution::2',
        TimelineEventType.executionFailed,
        'r1::execution::2::execution_failed'
      ),
    ];
    expect(lastTerminatedExecutionIndex({ events }, 'r1')).toBe(1);
    expect(executionTerminatedEventId('r1', 1)).toBe('r1::execution::1::execution_terminated');
  });

  it('returns -1 when the round has no execution_terminated', () => {
    const events = [
      userMessageEvent(
        {
          id: 'r1::user_message',
          input: { message: 'hello' },
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        conversation
      ),
      lifecycle('r1::execution', TimelineEventType.executionFailed, 'r1::execution_failed'),
    ];
    expect(lastTerminatedExecutionIndex({ events }, 'r1')).toBe(-1);
    expect(lastTerminatedExecutionIndex({ events: undefined }, 'r1')).toBe(-1);
  });
});
