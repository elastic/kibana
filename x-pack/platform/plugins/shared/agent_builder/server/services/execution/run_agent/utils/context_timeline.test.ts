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
  eventsNativeConversation,
  failedExec0Timeline,
  pausedAndResumedRoundTimeline,
  pausedRoundTimeline,
  timelineFromRounds,
} from '../../../../test_utils/timeline';
import {
  dropTimelineRounds,
  eventsForContext,
  groupTimelineEntries,
  groupTimelineRounds,
  isAwaitingPrompt,
  isInterruptedRound,
  isTimelineRound,
  isTimelineStandaloneUserMessage,
  lastExecutionTerminal,
  roundInterruption,
  roundResponse,
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
