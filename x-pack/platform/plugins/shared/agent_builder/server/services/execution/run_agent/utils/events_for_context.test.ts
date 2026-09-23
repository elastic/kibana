/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRound, TimelineEvent } from '@kbn/agent-builder-common';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import { pausedAndResumedRoundTimeline } from '../../../../test_utils/timeline';
import { eventsToRounds } from '../../../conversation/client/events_to_rounds';
import { roundsToEvents } from '../../../conversation/client/rounds_to_events';
import { eventsForContext, MAX_FAILED_EXECUTIONS_IN_CONTEXT } from './context_timeline';

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
  const userActor = { type: EventActorType.user, id: 'u1', username: 'user1' };
  const agentActor = { type: EventActorType.agent, id: 'agent-1' };

  const interruptedExecution = (
    roundId: string,
    createdAt: string,
    terminal: TimelineEventType.executionFailed | TimelineEventType.executionAborted
  ): TimelineEvent[] =>
    [
      {
        id: `${roundId}::user_message`,
        type: TimelineEventType.userMessage,
        created_at: createdAt,
        actor: userActor,
        data: { message: `${roundId} input` },
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
        id: `${roundId}::${terminal}`,
        type: terminal,
        created_at: createdAt,
        actor: agentActor,
        execution_id: `${roundId}::execution`,
        trigger_event_id: `${roundId}::user_message`,
        data: { time_to_last_token: 1, error: { code: 'internalError', message: 'boom' } },
      },
    ] as unknown as TimelineEvent[];

  const completedRound = (roundId: string, createdAt: string): TimelineEvent[] =>
    roundsToEvents(
      conversationWith({
        rounds: [{ ...storedRound(roundId, `${roundId} input`), started_at: createdAt }],
      })
    );

  const eventsNativeConversation = (events: TimelineEvent[]): Conversation =>
    conversationWith({ schema_version: CONVERSATION_SCHEMA_VERSION, events });

  const roundIds = (events: TimelineEvent[]) =>
    Array.from(new Set(events.map((event) => event.id.split('::')[0])));

  it('surfaces a failed initial execution in stored order and hides an aborted one', () => {
    const events = [
      ...completedRound('a', '2026-01-01T00:00:00.000Z'),
      ...interruptedExecution('f', '2026-01-01T00:01:00.000Z', TimelineEventType.executionFailed),
      ...interruptedExecution('x', '2026-01-01T00:02:00.000Z', TimelineEventType.executionAborted),
      ...completedRound('b', '2026-01-01T00:03:00.000Z'),
    ];

    const timeline = eventsForContext(eventsNativeConversation(events));

    expect(roundIds(timeline)).toEqual(['a', 'f', 'b']);
    expect(
      timeline.filter((event) => event.id.startsWith('f::')).map((event) => event.type)
    ).toEqual([
      TimelineEventType.userMessage,
      TimelineEventType.executionStarted,
      TimelineEventType.executionFailed,
    ]);
  });

  it('hides a failed resume execution (the round stays a paused round)', () => {
    const events = [
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

    const timeline = eventsForContext(eventsNativeConversation(events));

    expect(timeline.some((event) => event.type === TimelineEventType.executionFailed)).toBe(false);
    expect(eventsToRounds(timeline)).toHaveLength(1);
  });

  it('caps the surfaced failures to the most recent ones and restores chronological order', () => {
    const failures = Array.from({ length: MAX_FAILED_EXECUTIONS_IN_CONTEXT + 2 }, (_, index) =>
      interruptedExecution(
        `f${index}`,
        `2026-01-01T00:0${index}:00.000Z`,
        TimelineEventType.executionFailed
      )
    );
    const events = [...failures.flat(), ...completedRound('z', '2026-01-01T00:09:00.000Z')];

    const timeline = eventsForContext(eventsNativeConversation(events));

    // the two oldest failures are dropped; the rest keep chronological order
    expect(roundIds(timeline)).toEqual(['f2', 'f3', 'f4', 'z']);
  });

  it('breaks a timestamp tie by stored position (later stored wins)', () => {
    const sameInstant = '2026-01-01T00:00:00.000Z';
    const failures = Array.from({ length: MAX_FAILED_EXECUTIONS_IN_CONTEXT + 1 }, (_, index) =>
      interruptedExecution(`f${index}`, sameInstant, TimelineEventType.executionFailed)
    );

    const timeline = eventsForContext(eventsNativeConversation(failures.flat()));

    expect(roundIds(timeline)).toEqual(['f1', 'f2', 'f3']);
  });
});
