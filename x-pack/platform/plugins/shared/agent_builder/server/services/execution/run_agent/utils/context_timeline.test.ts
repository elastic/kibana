/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep, TimelineEvent } from '@kbn/agent-builder-common';
import {
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import {
  eventsNativeConversation,
  pausedAndResumedRoundTimeline,
  timelineFromRounds,
} from '../../../../test_utils/timeline';
import {
  eventsForContext,
  groupTimelineCycles,
  groupTimelineRounds,
  isAwaitingPrompt,
  lastExecutionTerminated,
  roundResponse,
  sliceTimelineAfterEvent,
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

describe('sliceTimelineAfterEvent', () => {
  const timeline = timelineFromRounds([{ id: 'a' }, { id: 'b' }]);

  it('returns the events strictly after the cursor event', () => {
    const cursor = timeline.filter((e) => e.id.startsWith('a::')).at(-1)!.id;
    const sliced = sliceTimelineAfterEvent(timeline, cursor);
    expect(sliced.every((e) => e.id.startsWith('b::'))).toBe(true);
    expect(sliced).toHaveLength(timeline.filter((e) => e.id.startsWith('b::')).length);
  });

  it('returns the full timeline when the cursor is not found', () => {
    expect(sliceTimelineAfterEvent(timeline, 'missing')).toEqual(timeline);
  });

  it('returns an empty array when the cursor is the last event', () => {
    expect(sliceTimelineAfterEvent(timeline, timeline.at(-1)!.id)).toEqual([]);
  });
});

describe('groupTimelineCycles', () => {
  const toolStep = (id: string, group: string): ConversationRoundStep => ({
    type: ConversationRoundStepType.toolCall,
    tool_call_id: id,
    tool_id: 'tool',
    params: {},
    results: [],
    tool_call_group_id: group,
  });
  const reasoning = (group: string): ConversationRoundStep => ({
    type: ConversationRoundStepType.reasoning,
    reasoning: 'r',
    tool_call_group_id: group,
  });

  const timeline = timelineFromRounds([
    {
      id: 'a',
      steps: [reasoning('g1'), toolStep('c1', 'g1'), toolStep('c2', 'g1'), toolStep('c3', 'g2')],
    },
    { id: 'b', steps: [toolStep('c4', 'g3')] },
  ]);

  it('starts a cycle at every change of tool_call_group_id, attaching preceding events to it', () => {
    const cycles = groupTimelineCycles(timeline);

    expect(cycles.map((c) => c.toolCallGroupId)).toEqual(['g1', 'g2', 'g3']);
    expect(cycles[0].events.map((e) => e.type)).toEqual([
      TimelineEventType.userMessage,
      TimelineEventType.executionStarted,
      TimelineEventType.executionStep,
      TimelineEventType.executionStep,
      TimelineEventType.executionStep,
    ]);
    expect(cycles[0].steps.map((s) => (s as any).tool_call_id ?? s.type)).toEqual([
      'reasoning',
      'c1',
      'c2',
    ]);
  });

  it('keeps trailing events with the open cycle but starts a new unit at the next user message', () => {
    const cycles = groupTimelineCycles(timeline);

    // round a's terminal event stays with g2; round b's user message opens the g3 unit
    expect(cycles[1].events.at(-1)!.type).toBe(TimelineEventType.executionTerminated);
    expect(cycles[2].events[0].type).toBe(TimelineEventType.userMessage);
    expect(cycles[2].lastEventId).toBe(timeline.at(-1)!.id);
    // slicing after g2 keeps round b intact
    expect(
      groupTimelineRounds(sliceTimelineAfterEvent(timeline, cycles[1].lastEventId))
    ).toHaveLength(1);
  });

  it('forms one cycle per round when rounds have no tool calls', () => {
    const cycles = groupTimelineCycles(timelineFromRounds([{ id: 'x' }, { id: 'y' }]));
    expect(cycles).toHaveLength(2);
    expect(cycles.map((c) => c.toolCallGroupId)).toEqual([undefined, undefined]);
    expect(cycles[0].events.every((e) => e.id.startsWith('x::'))).toBe(true);
  });

  it('returns no cycles for an empty timeline', () => {
    expect(groupTimelineCycles([])).toEqual([]);
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
