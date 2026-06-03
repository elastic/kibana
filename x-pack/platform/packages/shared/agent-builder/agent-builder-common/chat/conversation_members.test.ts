/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, TimelineEvent } from './conversation';
import { ConversationRoundStatus, TimelineEventType } from './conversation';
import {
  getConversationMembers,
  getConversationParticipantsFromEvents,
  mergeConversationMemberRefs,
} from './conversation_members';

describe('conversation_members', () => {
  const baseConversation: Conversation = {
    id: 'conv-1',
    agent_id: 'agent-1',
    user: { id: 'creator-uid', username: 'analyst_a' },
    title: 'Investigation',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    rounds: [],
  };

  describe('getConversationParticipantsFromEvents', () => {
    it('returns distinct authors from user_message events', () => {
      const events: TimelineEvent[] = [
        {
          id: 'msg-1',
          timestamp: '2024-01-01T00:00:00.000Z',
          type: TimelineEventType.user_message,
          user: { id: 'u1', username: 'analyst_a' },
          message: 'first note',
        },
        {
          id: 'round-1',
          timestamp: '2024-01-01T00:00:01.000Z',
          type: TimelineEventType.agentExecution,
          agent_id: 'agent-1',
          status: ConversationRoundStatus.completed,
          state: {},
          steps: [],
          response: { message: 'ok' },
          started_at: '2024-01-01T00:00:01.000Z',
          time_to_first_token: 0,
          time_to_last_token: 0,
          model_usage: { llm_calls: 0, input_tokens: 0, output_tokens: 0 },
        },
        {
          id: 'msg-2',
          timestamp: '2024-01-01T00:00:02.000Z',
          type: TimelineEventType.user_message,
          user: { id: 'u2', username: 'analyst_b' },
          message: 'follow-up',
        },
        {
          id: 'msg-3',
          timestamp: '2024-01-01T00:00:03.000Z',
          type: TimelineEventType.user_message,
          user: { id: 'u1', username: 'analyst_a' },
          message: 'duplicate author',
        },
      ];

      expect(getConversationParticipantsFromEvents(events)).toEqual([
        { uid: 'u1', username: 'analyst_a' },
        { uid: 'u2', username: 'analyst_b' },
      ]);
    });
  });

  describe('mergeConversationMemberRefs', () => {
    it('deduplicates by uid or username', () => {
      expect(
        mergeConversationMemberRefs(
          [{ uid: 'u1', username: 'analyst_a' }],
          [{ uid: 'u1', username: 'analyst_a' }],
          [{ username: 'analyst_b' }]
        )
      ).toEqual([
        { uid: 'u1', username: 'analyst_a' },
        { username: 'analyst_b' },
      ]);
    });

    it('deduplicates by username when uids differ', () => {
      expect(
        mergeConversationMemberRefs(
          [{ uid: 'real-uid', username: 'analyst_a' }],
          [{ uid: 'analyst-a-uid', username: 'analyst_a' }],
          [{ uid: 'u2', username: 'analyst_b' }]
        )
      ).toEqual([
        { uid: 'real-uid', username: 'analyst_a' },
        { uid: 'u2', username: 'analyst_b' },
      ]);
    });
  });

  describe('getConversationMembers', () => {
    it('merges event participants with assignees', () => {
      const conversation: Conversation = {
        ...baseConversation,
        events: [
          {
            id: 'msg-1',
            timestamp: '2024-01-01T00:00:00.000Z',
            type: TimelineEventType.user_message,
            user: { id: 'u1', username: 'analyst_a' },
            message: 'note',
          },
        ],
      };

      expect(
        getConversationMembers({
          conversation,
          assignees: [
            { uid: 'u1', username: 'analyst_a' },
            { uid: 'u3', username: 'analyst_c' },
          ],
        })
      ).toEqual([
        { uid: 'u1', username: 'analyst_a' },
        { uid: 'u3', username: 'analyst_c' },
      ]);
    });
  });
});
