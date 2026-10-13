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
  isAttachmentEvent,
} from '@kbn/agent-builder-common';
import {
  BOOM,
  T0,
  T1,
  abortedExec0Timeline,
  attachmentEventFixture,
  completedRoundTimeline,
  customEventFixture,
  eventsNativeConversation,
  failedExec0Timeline,
  pausedAndResumedRoundTimeline,
  pausedRoundTimeline,
  timelineFromRounds,
  userMessageEvent,
} from '../../../../test_utils/timeline';
import {
  standaloneEvents,
  eventsForContext,
  groupTimelineEntries,
  groupTimelineRounds,
  isAwaitingPrompt,
  isInterruptedRound,
  isTimelineStandaloneEvent,
  isTimelineRound,
  isTimelineStandaloneUserMessage,
  lastExecutionTerminal,
  linkedInputEvents,
  roundInterruption,
  roundResponse,
  standaloneUserMessages,
  type ContextTimelineEvent,
  type TimelineEntry,
} from './context_timeline';

const userActor = { type: EventActorType.user, id: 'u1', username: 'user1' };
const agentActor = { type: EventActorType.agent, id: 'agent-1' };

/** The id of the event an entry is ordered by. */
const entryId = (entry: TimelineEntry<ContextTimelineEvent>): string =>
  isTimelineStandaloneEvent(entry) ? entry.event.id : entry.userMessage.id;

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
    expect(isTimelineStandaloneEvent(entries[1])).toBe(true);
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

    expect(groupTimelineEntries(stored).map((entry) => isTimelineStandaloneEvent(entry))).toEqual([
      false,
      true,
    ]);
    expect(groupTimelineEntries(reversed).map((entry) => isTimelineStandaloneEvent(entry))).toEqual(
      [true, false]
    );
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
    expect(entries.map((entry) => isTimelineStandaloneEvent(entry))).toEqual([
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

  it('is ignored by groupTimelineRounds and selected by standaloneEvents', () => {
    expect(groupTimelineRounds(timeline).map((round) => round.id)).toEqual(['a', 'b']);
    expect(standaloneEvents(timeline).map((event) => event.id)).toEqual(['note']);
  });
});

describe('standaloneUserMessages', () => {
  it('keeps a message as standalone when only its input attachment events point at it', () => {
    const message = {
      id: 'm1',
      type: TimelineEventType.userMessage,
      created_at: T0,
      actor: userActor,
      data: { message: 'note' },
    } as TimelineEvent;
    const linked = {
      id: 'att',
      type: TimelineEventType.attachmentAdded,
      created_at: T0,
      actor: userActor,
      trigger_event_id: 'm1',
      data: {
        attachment_id: 'a1',
        attachment_type: 'text',
        current_version: 1,
        render_inline: false,
        source: 'chat_input',
        format: 2,
      },
    } as TimelineEvent;
    expect(standaloneUserMessages([message, linked]).map((event) => event.id)).toEqual(['m1']);
  });
});

describe('attachment events on the context timeline', () => {
  it('re-stamps resume attachment events into their folded round', () => {
    const conversation = eventsNativeConversation([
      ...pausedAndResumedRoundTimeline(),
      attachmentEventFixture({ id: 'att-exec0', executionId: 'r1::execution', toolCallId: 'c1' }),
      attachmentEventFixture({
        id: 'att-exec1',
        executionId: 'r1::execution::1',
        source: 'chat_input',
        triggerEventId: 'r1::prompt_response::1',
      }),
    ]);

    const [round] = groupTimelineRounds(eventsForContext(conversation));

    expect(
      round.events.filter(isAttachmentEvent).map((event) => [event.id, event.execution_id])
    ).toEqual([
      ['att-exec0', 'r1::execution'],
      ['att-exec1', 'r1::execution'],
    ]);
    expect(standaloneEvents(eventsForContext(conversation))).toEqual([]);
  });

  it('gives a standalone message its linked input events and no standalone entry for them', () => {
    const message = { ...userMessageEvent('m'), id: 'm1' } as TimelineEvent;
    const linked = attachmentEventFixture({
      id: 'att',
      source: 'chat_input',
      triggerEventId: 'm1',
    });
    const entries = groupTimelineEntries(
      eventsForContext(eventsNativeConversation([message, linked]))
    );

    expect(entries).toHaveLength(1);
    expect(
      isTimelineStandaloneUserMessage(entries[0]) && entries[0].events.map((event) => event.id)
    ).toEqual(['att']);
  });

  it('makes out-of-execution events standalone entries in timeline order', () => {
    const conversation = eventsNativeConversation([
      ...completedRoundTimeline('r1', T0),
      attachmentEventFixture({ id: 'api', source: 'http_api', createdAt: T1 }),
      attachmentEventFixture({
        id: 'legacy-workflow',
        source: 'workflow',
        createdAt: T1,
        legacy: true,
      }),
    ]);
    const entries = groupTimelineEntries(eventsForContext(conversation));

    expect(
      entries.map((entry) => (isTimelineStandaloneEvent(entry) ? entry.event.id : 'round'))
    ).toEqual(['round', 'api', 'legacy-workflow']);
  });

  it('never makes legacy chat_input events standalone entries', () => {
    const conversation = eventsNativeConversation([
      {
        ...userMessageEvent('m'),
        id: 'm1',
        data: { message: 'x', attachment_refs: [{ attachment_id: 'a', version: 1 }] },
      } as TimelineEvent,
      attachmentEventFixture({ id: 'old-input', source: 'chat_input', legacy: true }),
    ]);

    expect(standaloneEvents(eventsForContext(conversation))).toEqual([]);
  });

  it('falls back to its own position for a chat_input event whose message is missing', () => {
    const orphan = attachmentEventFixture({
      id: 'orphan',
      source: 'chat_input',
      triggerEventId: 'gone',
    });

    expect(
      standaloneEvents(eventsForContext(eventsNativeConversation([orphan]))).map(
        (event) => event.id
      )
    ).toEqual(['orphan']);
  });
});

describe('linkedInputEvents', () => {
  it('selects the current-format chat_input events linked to the message', () => {
    const events = [
      attachmentEventFixture({ id: 'a', source: 'chat_input', triggerEventId: 'm1' }),
      attachmentEventFixture({ id: 'b', source: 'execution', triggerEventId: 'm1' }),
      attachmentEventFixture({ id: 'c', source: 'chat_input', triggerEventId: 'm1', legacy: true }),
      attachmentEventFixture({ id: 'd', source: 'chat_input', triggerEventId: 'm2' }),
    ];

    expect(linkedInputEvents(events, 'm1').map((event) => event.id)).toEqual(['a']);
  });
});
