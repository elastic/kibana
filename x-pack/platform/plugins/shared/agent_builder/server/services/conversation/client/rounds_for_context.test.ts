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
  TimelineTriggerType,
} from '@kbn/agent-builder-common';
import { roundsForContext } from './events_to_rounds';

const roundTrio = (): TimelineEvent[] =>
  [
    {
      id: 'r1::user_message',
      type: TimelineEventType.userMessage,
      created_at: '2026-01-01T00:00:00.000Z',
      actor: { type: EventActorType.user, id: 'user-1', username: 'alice' },
      execution_id: 'r1::execution',
      data: { message: 'from events' },
    },
    {
      id: 'r1::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: '2026-01-01T00:00:00.000Z',
      actor: { type: EventActorType.agent, id: 'agent-1' },
      execution_id: 'r1::execution',
      trigger_event_id: 'r1::user_message',
      data: { trigger_type: TimelineTriggerType.userMessage },
    },
    {
      id: 'r1::execution_terminated',
      type: TimelineEventType.executionTerminated,
      created_at: '2026-01-01T00:00:00.020Z',
      actor: { type: EventActorType.agent, id: 'agent-1' },
      execution_id: 'r1::execution',
      trigger_event_id: 'r1::user_message',
      data: {
        steps: [],
        model_usage: { connector_id: 'c1', llm_calls: 1, input_tokens: 5, output_tokens: 7 },
        time_to_first_token: 10,
        time_to_last_token: 20,
        outcome: { type: 'responded', response: { message: 'ok' } },
      },
    },
  ] as unknown as TimelineEvent[];

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

describe('roundsForContext', () => {
  it('derives context rounds from the timeline, not the stored rounds, for an events-native conversation', () => {
    const conversation = conversationWith({
      events: roundTrio(),
      rounds: [],
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    const rounds = roundsForContext(conversation);

    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toEqual(
      expect.objectContaining({
        id: 'r1',
        status: ConversationRoundStatus.completed,
        input: { message: 'from events' },
      })
    );
  });

  it('uses the stored rounds for a legacy conversation, despite it carrying derived events', () => {
    const storedRound = { id: 'r-legacy' } as unknown as ConversationRound;
    const conversation = conversationWith({ events: roundTrio(), rounds: [storedRound] });

    expect(roundsForContext(conversation)).toEqual([storedRound]);
  });

  it('falls back to stored rounds when an events-native conversation has an empty timeline', () => {
    const storedRound = { id: 'r-legacy' } as unknown as ConversationRound;
    const conversation = conversationWith({
      events: [],
      rounds: [storedRound],
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    expect(roundsForContext(conversation)).toEqual([storedRound]);
  });

  it('produces no round for an orphan user_message (receipt-time input with no paired execution)', () => {
    const orphanUserMessage: TimelineEvent = {
      id: 'r-orphan::user_message',
      type: TimelineEventType.userMessage,
      created_at: '2026-01-01T00:00:00.000Z',
      actor: { type: EventActorType.user, id: 'user-1', username: 'alice' },
      data: { message: 'raw input that never ran' },
    } as unknown as TimelineEvent;

    const conversation = conversationWith({
      events: [orphanUserMessage],
      rounds: [],
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    expect(roundsForContext(conversation)).toEqual([]);
  });

  it('still produces no round when a paired execution_started is missing (input + terminal without a start)', () => {
    const orphanUserMessage: TimelineEvent = {
      id: 'r-partial::user_message',
      type: TimelineEventType.userMessage,
      created_at: '2026-01-01T00:00:00.000Z',
      actor: { type: EventActorType.user, id: 'user-1', username: 'alice' },
      data: { message: 'partial' },
    } as unknown as TimelineEvent;
    const executionStarted: TimelineEvent = {
      id: 'r-partial::execution_started',
      type: TimelineEventType.executionStarted,
      created_at: '2026-01-01T00:00:00.001Z',
      actor: { type: EventActorType.agent, id: 'agent-1' },
      execution_id: 'r-partial::execution',
      trigger_event_id: 'r-partial::user_message',
      data: { trigger_type: TimelineTriggerType.userMessage },
    } as unknown as TimelineEvent;

    const conversation = conversationWith({
      events: [orphanUserMessage, executionStarted],
      rounds: [],
      schema_version: CONVERSATION_SCHEMA_VERSION,
    });

    expect(roundsForContext(conversation)).toEqual([]);
  });
});
