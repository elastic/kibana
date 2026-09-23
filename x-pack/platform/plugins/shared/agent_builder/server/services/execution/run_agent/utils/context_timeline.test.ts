/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEvent } from '@kbn/agent-builder-common';
import {
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import {
  BOOM,
  T0,
  abortedExec0Timeline,
  completedRoundTimeline,
  customEventFixture,
  eventsNativeConversation,
  failedExec0Timeline,
  pausedAndResumedRoundTimeline,
  pausedRoundTimeline,
  timelineFromRounds,
} from '../../../../test_utils/timeline';
import {
  customEvents,
  dropTimelineRounds,
  eventsForContext,
  groupTimelineEntries,
  groupTimelineRounds,
  isAwaitingPrompt,
  isInterruptedRound,
  isTimelineCustomEvent,
  isTimelineRound,
  isTimelineStandaloneUserMessage,
  lastExecutionTerminal,
  roundInterruption,
  roundResponse,
  sliceTimelineRounds,
  type ContextTimelineEvent,
  type TimelineEntry,
} from './context_timeline';

const userActor = { type: EventActorType.user, id: 'u1', username: 'user1' };
const agentActor = { type: EventActorType.agent, id: 'agent-1' };

/** The id of the event an entry is ordered by. */
const entryId = (entry: TimelineEntry<ContextTimelineEvent>): string =>
  isTimelineCustomEvent(entry) ? entry.event.id : entry.userMessage.id;

/** A completed round's raw timeline events (alias for readability). */
const completedRoundEvents = completedRoundTimeline;

/** A failed initial execution's raw timeline events. */
const failedExecutionEvents = (id: string, at: string): TimelineEvent[] =>
  failedExec0Timeline(id, [], at);

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

describe('groupTimelineRounds — interrupted rounds', () => {
  it('yields an interrupted round with its terminal and steps', () => {
    const timeline = eventsForContext(
      eventsNativeConversation(
        failedExec0Timeline('r1', [{ type: ConversationRoundStepType.reasoning, reasoning: 'x' }])
      )
    );

    const [round] = groupTimelineRounds(timeline);

    expect(round.id).toBe('r1');
    expect(round.terminal.type).toBe(TimelineEventType.executionFailed);
    expect(round.steps).toHaveLength(1);
    expect(isInterruptedRound(round)).toBe(true);
    expect(roundInterruption(round)).toEqual({ type: 'failed', error: BOOM });
    expect(roundResponse(round)).toEqual({ message: '' });
    expect(isAwaitingPrompt(round)).toBe(false);
  });

  it('reports an aborted round with its source', () => {
    const [round] = groupTimelineRounds(abortedExec0Timeline('r1', T0, 'task_manager'));

    expect(isInterruptedRound(round)).toBe(true);
    expect(roundInterruption(round)).toEqual({
      type: 'aborted',
      aborted_by: { source: 'task_manager' },
    });
  });

  it('a completed round has no interruption', () => {
    const [round] = groupTimelineRounds(completedRoundTimeline());

    expect(isInterruptedRound(round)).toBe(false);
    expect(roundInterruption(round)).toBeUndefined();
  });

  it('keeps ordering with standalone messages', () => {
    const standalone = {
      id: 'sm',
      type: TimelineEventType.userMessage,
      created_at: '2026-01-01T00:00:30.000Z',
      actor: userActor,
      data: { message: 'standalone' },
    } as unknown as TimelineEvent;
    const timeline = eventsForContext(
      eventsNativeConversation([
        ...completedRoundTimeline('r1', T0),
        standalone,
        ...abortedExec0Timeline('r2', '2026-01-01T00:01:00.000Z'),
      ])
    );

    const entries = groupTimelineEntries(timeline);

    expect(entries.map((entry) => (isTimelineRound(entry) ? entry.id : 'message'))).toEqual([
      'r1',
      'message',
      'r2',
    ]);
    expect(isTimelineStandaloneUserMessage(entries[1])).toBe(true);
  });
});

describe('dropTimelineRounds', () => {
  const timeline = [...timelineFromRounds([{ id: 'a' }, { id: 'b' }]), ...independentIdsRound()];

  it('removes exactly the events of the given rounds and keeps stored order', () => {
    const dropped = dropTimelineRounds(timeline, new Set(['b']));

    expect(groupTimelineRounds(dropped).map((round) => round.id)).toEqual(['a', 'exec-abc']);
    expect(dropped.map((event) => event.id)).toEqual(
      timeline.filter((event) => !event.id.startsWith('b::')).map((event) => event.id)
    );
  });

  it('drops rounds whose ids follow no scheme through the trigger link', () => {
    expect(dropTimelineRounds(timeline, new Set(['exec-abc'])).map((event) => event.id)).toEqual(
      timeline.filter((event) => !['um', 'ec'].includes(event.id)).map((event) => event.id)
    );
  });

  it('returns the timeline unchanged for an empty set', () => {
    expect(dropTimelineRounds(timeline, new Set())).toBe(timeline);
  });
});

describe('lastExecutionTerminal (re-export)', () => {
  it('returns the terminal event of the last execution', () => {
    expect(lastExecutionTerminal(pausedAndResumedRoundTimeline())?.id).toBe(
      'r1::execution::1::execution_terminated'
    );
  });

  it('finds an interrupted terminal behind an earlier pause', () => {
    expect(
      lastExecutionTerminal([...pausedRoundTimeline('r1'), ...abortedExec0Timeline('r2')])?.type
    ).toBe(TimelineEventType.executionAborted);
  });

  it('is undefined for an empty timeline', () => {
    expect(lastExecutionTerminal([])).toBeUndefined();
  });
});

describe('groupTimelineEntries with custom events', () => {
  const timeline: ContextTimelineEvent[] = [
    ...completedRoundEvents('a', '2026-01-01T00:00:00.000Z'),
    customEventFixture({ id: 'note', created_at: '2026-01-01T00:01:00.000Z' }),
    ...completedRoundEvents('b', '2026-01-01T00:02:00.000Z'),
  ];

  it('yields a custom entry between the rounds, in timeline order', () => {
    const entries = groupTimelineEntries(timeline);

    expect(entries.map(entryId)).toEqual(['a::user_message', 'note', 'b::user_message']);
    expect(isTimelineCustomEvent(entries[1])).toBe(true);
    expect(isTimelineRound(entries[1])).toBe(false);
    expect(isTimelineStandaloneUserMessage(entries[1])).toBe(false);
  });

  it('breaks a timestamp tie with the round by stored position', () => {
    const sameInstant = '2026-01-01T00:00:00.000Z';
    const stored: ContextTimelineEvent[] = [
      ...completedRoundEvents('a', sameInstant),
      customEventFixture({ id: 'after', created_at: sameInstant }),
    ];
    const reversed: ContextTimelineEvent[] = [
      customEventFixture({ id: 'before', created_at: sameInstant }),
      ...completedRoundEvents('a', sameInstant),
    ];

    expect(groupTimelineEntries(stored).map((entry) => isTimelineCustomEvent(entry))).toEqual([
      false,
      true,
    ]);
    expect(groupTimelineEntries(reversed).map((entry) => isTimelineCustomEvent(entry))).toEqual([
      true,
      false,
    ]);
  });

  it('breaks a timestamp tie with a failed execution and a standalone message by stored position', () => {
    const sameInstant = '2026-01-01T00:00:00.000Z';
    const standalone: TimelineEvent = {
      id: 'msg',
      type: TimelineEventType.userMessage,
      created_at: sameInstant,
      actor: userActor,
      data: { message: 'hi' },
    };
    const stored: ContextTimelineEvent[] = [
      ...failedExecutionEvents('f', sameInstant),
      customEventFixture({ id: 'n1', created_at: sameInstant }),
      standalone,
      customEventFixture({ id: 'n2', created_at: sameInstant }),
    ];

    expect(groupTimelineEntries(stored).map(entryId)).toEqual([
      'f::user_message',
      'n1',
      'msg',
      'n2',
    ]);
    expect(groupTimelineEntries([...stored].reverse()).map(entryId)).toEqual([
      'n2',
      'msg',
      'n1',
      'f::user_message',
    ]);
  });

  it('interleaves several custom events with rounds, failures and messages by timestamp', () => {
    const at = (minute: number) => `2026-01-01T00:${String(minute).padStart(2, '0')}:00.000Z`;
    const standalone: TimelineEvent = {
      id: 'msg',
      type: TimelineEventType.userMessage,
      created_at: at(5),
      actor: userActor,
      data: { message: 'hi' },
    };
    // custom events stored at the tail, as addCustomEvents appends them
    const stored: ContextTimelineEvent[] = [
      ...completedRoundEvents('a', at(0)),
      ...failedExecutionEvents('f', at(2)),
      ...completedRoundEvents('b', at(4)),
      standalone,
      ...completedRoundEvents('c', at(6)),
      customEventFixture({ id: 'n3', created_at: at(3) }),
      customEventFixture({ id: 'n1', created_at: at(1) }),
      customEventFixture({ id: 'n7', created_at: at(7) }),
    ];

    const entries = groupTimelineEntries(stored);

    expect(entries.map(entryId)).toEqual([
      'a::user_message',
      'n1',
      'f::user_message',
      'n3',
      'b::user_message',
      'msg',
      'c::user_message',
      'n7',
    ]);
    expect(entries.map((entry) => isTimelineCustomEvent(entry))).toEqual([
      false,
      true,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
    expect(groupTimelineRounds(stored).map((round) => round.id)).toEqual(['a', 'f', 'b', 'c']);
  });

  it('is ignored by groupTimelineRounds and selected by customEvents', () => {
    expect(groupTimelineRounds(timeline).map((round) => round.id)).toEqual(['a', 'b']);
    expect(customEvents(timeline).map((event) => event.id)).toEqual(['note']);
  });
});

describe('sliceTimelineRounds with custom events', () => {
  const timeline: ContextTimelineEvent[] = [
    customEventFixture({ id: 'n0', created_at: '2025-12-31T00:00:00.000Z' }),
    ...completedRoundEvents('a', '2026-01-01T00:00:00.000Z'),
    customEventFixture({ id: 'n1', created_at: '2026-01-01T00:01:00.000Z' }),
    ...completedRoundEvents('b', '2026-01-01T00:02:00.000Z'),
    customEventFixture({ id: 'n2', created_at: '2026-01-01T00:03:00.000Z' }),
    ...completedRoundEvents('c', '2026-01-01T00:04:00.000Z'),
  ];
  const entryIds = (events: ContextTimelineEvent[]) =>
    Array.from(new Set(events.map((event) => event.id.split('::')[0])));

  it('keeps every custom event when slicing from the start', () => {
    expect(entryIds(sliceTimelineRounds(timeline, 0))).toEqual(['n0', 'a', 'n1', 'b', 'n2', 'c']);
  });

  it('drops custom events older than the first kept round (the cut) and keeps the newer ones', () => {
    expect(entryIds(sliceTimelineRounds(timeline, 1))).toEqual(['b', 'n2', 'c']);
  });

  it('keeps custom events older than the first excluded round when an end bound is given', () => {
    expect(entryIds(sliceTimelineRounds(timeline, 0, 2))).toEqual(['n0', 'a', 'n1', 'b', 'n2']);
  });

  it('when the cut removes every round, keeps only custom events after the last removed round ended', () => {
    const late = customEventFixture({ id: 'n3', created_at: '2026-01-01T00:05:00.000Z' });

    expect(entryIds(sliceTimelineRounds([...timeline, late], 3))).toEqual(['n3']);
    expect(entryIds(sliceTimelineRounds(timeline, 3))).toEqual([]);
  });
});
