/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEvent } from '@kbn/agent-builder-common';
import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import {
  eventsNativeConversation,
  pausedAndResumedRoundTimeline,
  timelineFromRounds,
} from '../../../../test_utils/timeline';
import {
  eventsForContext,
  groupTimelineEntries,
  groupTimelineFailedExecutions,
  groupTimelineRounds,
  isAwaitingPrompt,
  isTimelineFailedExecution,
  isTimelineRound,
  isTimelineStandaloneUserMessage,
  lastExecutionTerminated,
  roundResponse,
  sliceTimelineRounds,
} from './context_timeline';

const userActor = { type: EventActorType.user, id: 'u1', username: 'user1' };
const agentActor = { type: EventActorType.agent, id: 'agent-1' };

/** A round whose event ids follow no scheme: ownership is only expressed through the trigger link. */
const independentIdsRound = (): TimelineEvent[] =>
  [
    {
      id: 'um',
      type: TimelineEventType.userMessage,
      created_at: '2026-01-01T00:00:00.000Z',
      actor: userActor,
      data: { message: 'hi' },
    },
    {
      id: 'ec',
      type: TimelineEventType.executionTerminated,
      created_at: '2026-01-01T00:00:01.000Z',
      actor: agentActor,
      execution_id: 'exec-abc',
      trigger_event_id: 'um',
      data: {
        steps: [],
        model_usage: { connector_id: '', llm_calls: 0, input_tokens: 0, output_tokens: 0 },
        time_to_first_token: 0,
        time_to_last_token: 0,
        outcome: { type: 'responded', response: { message: 'yo' } },
      },
    },
  ] as unknown as TimelineEvent[];

describe('groupTimelineRounds', () => {
  it('groups a normalized timeline into rounds, in order', () => {
    const timeline = timelineFromRounds([
      { id: 'a', input: { message: 'first' }, response: { message: 'one' } },
      { id: 'b', input: { message: 'second' }, response: { message: 'two' } },
    ]);

    const rounds = groupTimelineRounds(timeline);

    expect(rounds.map((round) => round.id)).toEqual(['a', 'b']);
    expect(rounds[1].userMessage.data.message).toBe('second');
    expect(roundResponse(rounds[1])).toEqual({ message: 'two' });
    expect(rounds[1].events.map((event) => event.id)).toEqual(
      timeline.filter((event) => event.id.startsWith('b::')).map((event) => event.id)
    );
  });

  it('resolves ownership through trigger_event_id, not the id scheme', () => {
    const [round] = groupTimelineRounds(independentIdsRound());

    expect(round.id).toBe('exec-abc');
    expect(round.userMessage.id).toBe('um');
    expect(round.events.map((event) => event.id)).toEqual(['um', 'ec']);
  });

  it('forms no round for an execution without a trigger or without a terminal', () => {
    const orphanTrigger = independentIdsRound().filter((event) => event.id !== 'um');
    const noTerminal = independentIdsRound().filter((event) => event.id !== 'ec');

    expect(groupTimelineRounds(orphanTrigger)).toEqual([]);
    expect(groupTimelineRounds(noTerminal)).toEqual([]);
  });

  it('reads the answered ask and the final response once a resumed round is normalized', () => {
    const normalized = eventsForContext(eventsNativeConversation(pausedAndResumedRoundTimeline()));

    const rounds = groupTimelineRounds(normalized);

    expect(rounds).toHaveLength(1);
    expect(isAwaitingPrompt(rounds[0])).toBe(false);
    expect(roundResponse(rounds[0])).toEqual({ message: 'done' });
    expect(rounds[0].steps[0]).toEqual(
      expect.objectContaining({ prompt_id: 'p1', answers: [{ choice: [0] }] })
    );
  });

  it('reports a paused round as awaiting a prompt', () => {
    const paused = pausedAndResumedRoundTimeline().slice(0, 4);

    const [round] = groupTimelineRounds(paused);

    expect(isAwaitingPrompt(round)).toBe(true);
    expect(roundResponse(round)).toEqual({ message: '' });
  });
});

describe('sliceTimelineRounds', () => {
  const timeline = [...timelineFromRounds([{ id: 'a' }, { id: 'b' }]), ...independentIdsRound()];

  it('keeps the events of the rounds in the requested range', () => {
    expect(groupTimelineRounds(sliceTimelineRounds(timeline, 1)).map((round) => round.id)).toEqual([
      'b',
      'exec-abc',
    ]);
    expect(sliceTimelineRounds(timeline, 2).map((event) => event.id)).toEqual(['um', 'ec']);
  });

  it('supports an end bound', () => {
    expect(
      groupTimelineRounds(sliceTimelineRounds(timeline, 0, 1)).map((round) => round.id)
    ).toEqual(['a']);
  });
});

describe('lastExecutionTerminated', () => {
  it('returns the terminal event of the last execution', () => {
    expect(lastExecutionTerminated(pausedAndResumedRoundTimeline())?.id).toBe(
      'r1::execution::1::execution_terminated'
    );
  });

  it('is undefined for an empty timeline', () => {
    expect(lastExecutionTerminated([])).toBeUndefined();
  });
});

/** A failed initial execution: user_message, execution_started, one step, execution_failed. */
const failedExecutionEvents = (
  roundId: string,
  createdAt: string,
  message = 'failed input'
): TimelineEvent[] =>
  [
    {
      id: `${roundId}::user_message`,
      type: TimelineEventType.userMessage,
      created_at: createdAt,
      actor: userActor,
      data: { message },
    },
    {
      id: `${roundId}::execution_started`,
      type: TimelineEventType.executionStarted,
      created_at: createdAt,
      actor: agentActor,
      execution_id: `${roundId}::execution`,
      trigger_event_id: `${roundId}::user_message`,
      data: { trigger_type: 'user_message' },
    },
    {
      id: `${roundId}::step::0`,
      type: TimelineEventType.executionStep,
      created_at: createdAt,
      actor: agentActor,
      execution_id: `${roundId}::execution`,
      trigger_event_id: `${roundId}::user_message`,
      data: { step: { type: 'reasoning', reasoning: 'thinking' }, sequence: 0 },
    },
    {
      id: `${roundId}::execution_failed`,
      type: TimelineEventType.executionFailed,
      created_at: createdAt,
      actor: agentActor,
      execution_id: `${roundId}::execution`,
      trigger_event_id: `${roundId}::user_message`,
      data: { time_to_last_token: 1, error: { code: 'internalError', message: 'boom' } },
    },
  ] as unknown as TimelineEvent[];

const completedRoundEvents = (roundId: string, createdAt: string): TimelineEvent[] =>
  timelineFromRounds([
    { id: roundId, input: { message: `${roundId} input` }, started_at: createdAt },
  ]);

describe('groupTimelineFailedExecutions', () => {
  it('groups a failed initial execution with its user message, steps and terminal', () => {
    const timeline = failedExecutionEvents('f1', '2026-01-01T00:00:00.000Z');
    const [entry] = groupTimelineFailedExecutions(timeline);

    expect(entry.id).toBe('f1');
    expect(entry.userMessage.id).toBe('f1::user_message');
    expect(entry.failed.id).toBe('f1::execution_failed');
    expect(entry.steps).toEqual([{ type: 'reasoning', reasoning: 'thinking' }]);
    expect(entry.events.map((event) => event.id)).toEqual([
      'f1::user_message',
      'f1::execution_started',
      'f1::step::0',
      'f1::execution_failed',
    ]);
  });

  it('ignores aborted executions, failed resumes and terminated executions', () => {
    const aborted = failedExecutionEvents('a1', '2026-01-01T00:00:00.000Z').map((event) =>
      event.type === TimelineEventType.executionFailed
        ? { ...event, id: 'a1::execution_aborted', type: TimelineEventType.executionAborted }
        : event
    ) as TimelineEvent[];
    const failedResume = [
      ...pausedAndResumedRoundTimeline().filter((event) => !event.execution_id?.endsWith('::1')),
      {
        id: 'r1::execution::1::execution_failed',
        type: TimelineEventType.executionFailed,
        created_at: '2026-01-01T00:00:03.000Z',
        actor: agentActor,
        execution_id: 'r1::execution::1',
        trigger_event_id: 'r1::prompt_response::1',
        data: { time_to_last_token: 1, error: { code: 'internalError', message: 'boom' } },
      },
    ] as TimelineEvent[];

    expect(groupTimelineFailedExecutions(aborted)).toEqual([]);
    expect(groupTimelineFailedExecutions(failedResume)).toEqual([]);
    expect(
      groupTimelineFailedExecutions(completedRoundEvents('c1', '2026-01-01T00:00:00.000Z'))
    ).toEqual([]);
  });
});

describe('groupTimelineEntries with failed executions', () => {
  const timeline = [
    ...completedRoundEvents('a', '2026-01-01T00:00:00.000Z'),
    ...failedExecutionEvents('f', '2026-01-01T00:01:00.000Z'),
    ...completedRoundEvents('b', '2026-01-01T00:02:00.000Z'),
  ];

  it('yields a failed entry between the rounds, in timeline order', () => {
    const entries = groupTimelineEntries(timeline);

    expect(entries.map((entry) => entry.userMessage.id)).toEqual([
      'a::user_message',
      'f::user_message',
      'b::user_message',
    ]);
    expect(isTimelineFailedExecution(entries[1])).toBe(true);
    expect(isTimelineRound(entries[1])).toBe(false);
    expect(isTimelineStandaloneUserMessage(entries[1])).toBe(false);
  });

  it('is ignored by groupTimelineRounds', () => {
    expect(groupTimelineRounds(timeline).map((round) => round.id)).toEqual(['a', 'b']);
  });
});

describe('sliceTimelineRounds with failed executions', () => {
  const timeline = [
    ...failedExecutionEvents('f0', '2025-12-31T00:00:00.000Z'),
    ...completedRoundEvents('a', '2026-01-01T00:00:00.000Z'),
    ...failedExecutionEvents('f1', '2026-01-01T00:01:00.000Z'),
    ...completedRoundEvents('b', '2026-01-01T00:02:00.000Z'),
    ...failedExecutionEvents('f2', '2026-01-01T00:03:00.000Z'),
    ...completedRoundEvents('c', '2026-01-01T00:04:00.000Z'),
  ];
  const roundIds = (events: TimelineEvent[]) =>
    Array.from(new Set(events.map((event) => event.id.split('::')[0])));

  it('keeps every failed execution when slicing from the start', () => {
    expect(roundIds(sliceTimelineRounds(timeline, 0))).toEqual(['f0', 'a', 'f1', 'b', 'f2', 'c']);
  });

  it('drops failed executions older than the first kept round (the cut) and keeps the newer ones', () => {
    // f0 and f1 precede round b, the first kept round: they are compacted away, never summarised
    expect(roundIds(sliceTimelineRounds(timeline, 1))).toEqual(['b', 'f2', 'c']);
  });

  it('keeps failed executions older than the first excluded round when an end bound is given', () => {
    // f2 precedes round c, the first excluded round, so it belongs to the kept range
    expect(roundIds(sliceTimelineRounds(timeline, 0, 2))).toEqual(['f0', 'a', 'f1', 'b', 'f2']);
  });

  it('when the cut removes every round, keeps only failures after the last removed round ended', () => {
    // a summary covering all three rounds: f0, f1 and f2 are interleaved with removed rounds and
    // must not be resurrected; a failure after round c ended survives
    const late = failedExecutionEvents('f3', '2026-01-01T00:05:00.000Z');
    const withLate = [...timeline, ...late];

    expect(roundIds(sliceTimelineRounds(withLate, 3))).toEqual(['f3']);
    expect(roundIds(sliceTimelineRounds(timeline, 3))).toEqual([]);
  });

  it('preserves stored order (Round B → Failed F2 → Round C)', () => {
    const sliced = sliceTimelineRounds(timeline, 1, 3);
    expect(sliced.map((event) => event.id)).toEqual(
      timeline
        .filter((event) => ['b', 'f2', 'c'].includes(event.id.split('::')[0]))
        .map((event) => event.id)
    );
  });
});
