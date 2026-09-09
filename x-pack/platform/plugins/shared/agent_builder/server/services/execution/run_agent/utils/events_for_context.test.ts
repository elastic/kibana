/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRound } from '@kbn/agent-builder-common';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationRoundStatus,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import { pausedAndResumedRoundTimeline } from '../../../../test_utils/timeline';
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
