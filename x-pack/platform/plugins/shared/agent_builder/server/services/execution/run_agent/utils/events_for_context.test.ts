/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationEvent,
  ConversationRound,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  ConversationRoundStepType,
  TimelineEventType,
  isExecutionTerminalEvent,
  isTimelineEvent,
} from '@kbn/agent-builder-common';
import {
  abortedExec0Timeline,
  completedRoundTimeline,
  customEventFixture,
  failedExec0Timeline,
  pausedAndResumedRoundTimeline,
  pausedThenInterruptedResumeTimeline,
} from '../../../../test_utils/timeline';
import { eventsToRounds } from '../../../conversation/client/events_to_rounds';
import { roundsToEvents } from '../../../conversation/client/rounds_to_events';
import { eventsForContext } from './context_timeline';

const storedRound = (id: string, message: string): ConversationRound => ({
  id,
  status: ConversationRoundStatus.completed,
  input: { message },
  response: { message: `${message} response` },
  steps: [],
  started_at: '2026-01-01T00:00:00.000Z',
  time_to_first_token: 1,
  time_to_last_token: 2,
  model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
});

const conversationWith = (parts: Partial<Conversation>): Conversation =>
  ({
    id: 'c1',
    agent_id: 'agent-1',
    user: { id: 'user-1', username: 'alice' },
    title: 'T',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    rounds: [],
    ...parts,
  } as Conversation);

describe('eventsForContext', () => {
  it('normalizes an events-native conversation from its timeline, not its stored rounds', () => {
    const conversation = conversationWith({
      events: pausedAndResumedRoundTimeline(),
      rounds: [storedRound('r-stale', 'stale')],
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    const rounds = eventsToRounds(eventsForContext(conversation));

    expect(rounds.map((round) => round.input.message)).toEqual(['do it']);
  });

  it('folds a resumed round into a single execution', () => {
    const conversation = conversationWith({
      events: pausedAndResumedRoundTimeline(),
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    const timeline = eventsForContext(conversation);

    expect(new Set(timeline.map((event) => event.execution_id).filter(Boolean))).toEqual(
      new Set(['r1::execution'])
    );
    expect(timeline.some((event) => event.type === TimelineEventType.promptResponse)).toBe(false);
    const [round] = eventsToRounds(timeline);
    expect(round.status).toBe(ConversationRoundStatus.completed);
    expect(round.response).toEqual({ message: 'done' });
    expect(round.steps[0]).toEqual(
      expect.objectContaining({ prompt_id: 'p1', answers: [{ choice: [0] }] })
    );
  });

  it('serializes a legacy conversation from its rounds, ignoring any derived events it carries', () => {
    const rounds = [storedRound('r1', 'first'), storedRound('r2', 'second')];
    const conversation = conversationWith({ events: pausedAndResumedRoundTimeline(), rounds });

    const events = eventsForContext(conversation);

    expect(events).toEqual(roundsToEvents(conversation));
    expect(eventsToRounds(events).map((round) => round.id)).toEqual(['r1', 'r2']);
  });

  it('falls back to the stored rounds when an events-native conversation has no events', () => {
    const conversation = conversationWith({
      events: [],
      rounds: [storedRound('r1', 'first')],
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    expect(eventsToRounds(eventsForContext(conversation)).map((round) => round.id)).toEqual(['r1']);
  });

  it('returns an empty timeline for a conversation without rounds or events', () => {
    expect(eventsForContext(conversationWith({}))).toEqual([]);
  });
});

describe('eventsForContext — interrupted executions', () => {
  const eventsNativeConversation = (events: TimelineEvent[]): Conversation =>
    conversationWith({ schema_version: CONVERSATION_SCHEMA_VERSION, events });

  const roundIds = (events: ConversationEvent[]) =>
    Array.from(new Set(events.map((event) => event.id.split('::')[0])));

  it('includes a failed and an aborted initial execution as interrupted rounds, in stored order', () => {
    const events = [
      ...completedRoundTimeline('r1', '2026-01-01T00:00:00.000Z'),
      ...failedExec0Timeline(
        'r2',
        [{ type: ConversationRoundStepType.reasoning, reasoning: 'thinking' }],
        '2026-01-01T00:01:00.000Z'
      ),
      ...abortedExec0Timeline('r3', '2026-01-01T00:02:00.000Z'),
      ...completedRoundTimeline('r4', '2026-01-01T00:03:00.000Z'),
    ];

    const timeline = eventsForContext(eventsNativeConversation(events));

    expect(roundIds(timeline)).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(timeline.filter(isExecutionTerminalEvent).map((event) => event.type)).toEqual([
      TimelineEventType.executionTerminated,
      TimelineEventType.executionFailed,
      TimelineEventType.executionAborted,
      TimelineEventType.executionTerminated,
    ]);
    expect(timeline.filter((event) => event.type === TimelineEventType.executionStep)).toHaveLength(
      1
    );
    // no duplicates
    expect(new Set(timeline.map((event) => event.id)).size).toBe(timeline.length);
  });

  it('folds an interrupted resume into its round: one execution whose terminal is execution_failed', () => {
    const timeline = eventsForContext(
      eventsNativeConversation(pausedThenInterruptedResumeTimeline('r1'))
    );

    expect(
      timeline.filter((event) => event.type === TimelineEventType.promptResponse)
    ).toHaveLength(0);
    expect(timeline.filter(isExecutionTerminalEvent).map((event) => event.id)).toEqual([
      'r1::execution_failed',
    ]);
    expect(new Set(timeline.map((event) => event.execution_id).filter(Boolean))).toEqual(
      new Set(['r1::execution'])
    );
  });
});

describe('eventsForContext — custom events', () => {
  const completedRound = (roundId: string, createdAt: string): TimelineEvent[] =>
    roundsToEvents(
      conversationWith({
        rounds: [{ ...storedRound(roundId, `${roundId} input`), started_at: createdAt }],
      })
    );
  const entryIds = (events: ConversationEvent[]) =>
    Array.from(new Set(events.map((event) => event.id.split('::')[0])));

  it('carries a custom event through, positioned by timestamp between the rounds', () => {
    const note = customEventFixture({ id: 'note', created_at: '2026-01-01T00:01:00.000Z' });
    const conversation = conversationWith({
      schema_version: CONVERSATION_SCHEMA_VERSION,
      // stored at the tail, as addCustomEvents appends it
      events: [
        ...completedRound('a', '2026-01-01T00:00:00.000Z'),
        ...completedRound('b', '2026-01-01T00:02:00.000Z'),
        note,
      ],
    });

    const timeline = eventsForContext(conversation);

    expect(entryIds(timeline)).toEqual(['a', 'note', 'b']);
    expect(timeline.find((event) => event.id === 'note')).toEqual(note);
    // built-in normalization is unaffected
    expect(eventsToRounds(timeline.filter(isTimelineEvent)).map((round) => round.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('breaks a timestamp tie by stored position', () => {
    const sameInstant = '2026-01-01T00:00:00.000Z';
    const conversation = conversationWith({
      schema_version: CONVERSATION_SCHEMA_VERSION,
      events: [
        customEventFixture({ id: 'before', created_at: sameInstant }),
        ...completedRound('a', sameInstant),
        customEventFixture({ id: 'after', created_at: sameInstant }),
      ],
    });

    expect(entryIds(eventsForContext(conversation))).toEqual(['before', 'a', 'after']);
  });

  it('yields no custom event for a legacy (rounds-only) conversation', () => {
    const conversation = conversationWith({
      rounds: [storedRound('r1', 'first')],
      events: [customEventFixture({ id: 'note', created_at: '2026-01-01T00:01:00.000Z' })],
    });

    expect(eventsForContext(conversation).every(isTimelineEvent)).toBe(true);
  });
});
