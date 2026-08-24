/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, ConversationRound, TimelineEvent } from '@kbn/agent-builder-common';
import {
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
  it('derives context rounds from events, not from the stored rounds, when events are present', () => {
    // rounds is empty/stale on purpose — if the helper read rounds it would return [].
    const conversation = conversationWith({ events: roundTrio(), rounds: [] });

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

  it('falls back to stored rounds when the conversation has no events', () => {
    const storedRound = { id: 'r-legacy' } as unknown as ConversationRound;
    const conversation = conversationWith({ events: [], rounds: [storedRound] });

    expect(roundsForContext(conversation)).toEqual([storedRound]);
  });
});
