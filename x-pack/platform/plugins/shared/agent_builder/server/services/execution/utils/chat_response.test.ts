/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationAccessControlMode,
  ConversationRoundStatus,
  type ChatEvent,
} from '@kbn/agent-builder-common';
import {
  buildChatResponseFromEvents,
  buildSimpleChatResponseFromEvents,
} from './chat_response';

const conversationId = 'c250305b-1929-4248-b568-b9e3f065fda5';
const roundId = 'a5692d54-bc06-4a6e-aea1-412779c73f66';

const completedRound = {
  id: roundId,
  status: ConversationRoundStatus.completed,
  input: { message: 'Hello' },
  response: { message: 'Hi there!' },
  steps: [],
  started_at: '2026-01-01T00:00:00.000Z',
  time_to_first_token: 10,
  time_to_last_token: 20,
  model_usage: {
    connector_id: 'connector-1',
    llm_calls: 1,
    input_tokens: 10,
    output_tokens: 5,
  },
};

const baseEvents = (): ChatEvent[] => [
  {
    type: ChatEventType.conversationCreated,
    data: {
      conversation_id: conversationId,
      title: 'Hello',
      access_control: { access_mode: ConversationAccessControlMode.Private },
      user: { id: 'u1', username: 'user' },
    },
  },
  {
    type: ChatEventType.roundComplete,
    data: {
      round: completedRound,
    },
  },
];

describe('buildChatResponseFromEvents', () => {
  it('returns the full round payload', () => {
    const result = buildChatResponseFromEvents(baseEvents());
    expect(result.conversation_id).toBe(conversationId);
    expect(result.round_id).toBe(roundId);
    expect(result.response.message).toBe('Hi there!');
    expect(result.access_control).toEqual({
      access_mode: ConversationAccessControlMode.Private,
    });
  });
});

describe('buildSimpleChatResponseFromEvents', () => {
  it('returns only conversation_id and answer', () => {
    expect(buildSimpleChatResponseFromEvents(baseEvents())).toEqual({
      conversation_id: conversationId,
      answer: 'Hi there!',
    });
  });

  it('returns an empty answer when the round has no message', () => {
    const events = baseEvents();
    const roundComplete = events.find((e) => e.type === ChatEventType.roundComplete);
    if (roundComplete?.type === ChatEventType.roundComplete) {
      roundComplete.data.round = {
        ...roundComplete.data.round,
        response: { message: '' },
      };
    }
    expect(buildSimpleChatResponseFromEvents(events)).toEqual({
      conversation_id: conversationId,
      answer: '',
    });
  });

  it('throws when round_complete is missing', () => {
    expect(() =>
      buildSimpleChatResponseFromEvents([
        {
          type: ChatEventType.conversationCreated,
          data: {
            conversation_id: conversationId,
            title: 'Hello',
            access_control: { access_mode: ConversationAccessControlMode.Private },
            user: { id: 'u1', username: 'user' },
          },
        },
      ])
    ).toThrow(/round_complete/);
  });
});
