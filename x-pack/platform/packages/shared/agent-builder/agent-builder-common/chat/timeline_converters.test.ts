/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationRound,
  UserMessageEvent,
  AgentExecutionEvent,
  TimelineConversation,
} from '.';
import { ConversationRoundStatus, TimelineEventType, UserActionType } from '.';
import {
  roundsToTimelineEvents,
  timelineEventsToRounds,
  timelineEventsToRoundEntries,
  timelineEventsToActivityEntries,
  mergeLegacyRoundsWithPersistedEvents,
  isHumanNoteRound,
  conversationToTimelineConversation,
  resolveConversationEvents,
  timelineConversationToConversation,
  agentExecutionEventToRound,
} from './timeline_converters';

const createTestRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  steps: [],
  response: { message: 'world' },
  started_at: '2024-01-01T00:00:00.000Z',
  time_to_first_token: 100,
  time_to_last_token: 500,
  model_usage: {
    connector_id: 'conn-1',
    llm_calls: 1,
    input_tokens: 10,
    output_tokens: 20,
  },
  ...overrides,
});

const testUser = { id: 'user-1', username: 'testuser' };
const testAgentId = 'agent-1';

describe('timeline_converters', () => {
  describe('roundsToTimelineEvents', () => {
    it('converts empty rounds to empty events', () => {
      const events = roundsToTimelineEvents([], testUser, testAgentId);
      expect(events).toEqual([]);
    });

    it('converts a single round to user_message + agent_execution events', () => {
      const round = createTestRound();
      const events = roundsToTimelineEvents([round], testUser, testAgentId);

      expect(events).toHaveLength(2);

      const userEvent = events[0] as UserMessageEvent;
      expect(userEvent.type).toBe(TimelineEventType.user_message);
      expect(userEvent.user).toEqual(testUser);
      expect(userEvent.message).toBe('hello');
      expect(userEvent.id).toBe('msg-round-1');

      const agentEvent = events[1] as AgentExecutionEvent;
      expect(agentEvent.type).toBe(TimelineEventType.agentExecution);
      expect(agentEvent.agent_id).toBe(testAgentId);
      expect(agentEvent.id).toBe('round-1');
      expect(agentEvent.response.message).toBe('world');
      expect(agentEvent.model_usage.input_tokens).toBe(10);
    });

    it('preserves attachments from round input', () => {
      const round = createTestRound({
        input: {
          message: 'hello',
          attachments: [{ id: 'att-1', type: 'text', data: { content: 'test' } }],
          attachment_refs: [{ attachment_id: 'att-1', version: 1 }],
        },
      });
      const events = roundsToTimelineEvents([round], testUser, testAgentId);
      const userEvent = events[0] as UserMessageEvent;

      expect(userEvent.attachments).toHaveLength(1);
      expect(userEvent.attachment_refs).toHaveLength(1);
    });

    it('converts multiple rounds preserving order', () => {
      const rounds = [
        createTestRound({ id: 'r1', input: { message: 'first' } }),
        createTestRound({ id: 'r2', input: { message: 'second' } }),
      ];
      const events = roundsToTimelineEvents(rounds, testUser, testAgentId);

      expect(events).toHaveLength(4);
      expect((events[0] as UserMessageEvent).message).toBe('first');
      expect((events[1] as AgentExecutionEvent).id).toBe('r1');
      expect((events[2] as UserMessageEvent).message).toBe('second');
      expect((events[3] as AgentExecutionEvent).id).toBe('r2');
    });
  });

  describe('mergeLegacyRoundsWithPersistedEvents', () => {
    it('deduplicates legacy rounds already present in persisted events', () => {
      const round = createTestRound({ id: 'e8e867d7-c1e9-4cb4-a1f8-892b82d8a697' });
      const legacyEvents = roundsToTimelineEvents([round], testUser, testAgentId);
      const persistedEvents = [...legacyEvents];

      const merged = mergeLegacyRoundsWithPersistedEvents({
        legacyRounds: [round],
        persistedEvents,
        user: testUser,
        agentId: testAgentId,
      });

      expect(merged).toEqual(persistedEvents);
      expect(timelineEventsToActivityEntries(merged)).toHaveLength(1);
    });

    it('merges legacy-only rounds with persisted events in chronological order', () => {
      const legacyRound = createTestRound({
        id: 'legacy-round',
        started_at: '2024-01-01T00:00:00.000Z',
      });
      const persistedEvents = roundsToTimelineEvents(
        [
          createTestRound({
            id: 'persisted-round',
            input: { message: 'new' },
            started_at: '2024-01-01T01:00:00.000Z',
          }),
        ],
        testUser,
        testAgentId
      );

      const merged = mergeLegacyRoundsWithPersistedEvents({
        legacyRounds: [legacyRound],
        persistedEvents,
        user: testUser,
        agentId: testAgentId,
      });

      expect(merged).toHaveLength(4);
      expect((merged[1] as AgentExecutionEvent).id).toBe('legacy-round');
      expect((merged[3] as AgentExecutionEvent).id).toBe('persisted-round');
    });

    it('keeps human notes in chronological order when legacy rounds only include the latest note', () => {
      const analystA = { id: 'user-a', username: 'analyst_a' };
      const agentRound = createTestRound({
        id: 'agent-round',
        started_at: '2024-01-01T00:00:00.000Z',
      });
      const note1: UserMessageEvent = {
        id: 'note-1',
        timestamp: '2024-01-01T01:00:00.000Z',
        type: TimelineEventType.user_message,
        user: analystA,
        message: 'first note',
      };
      const note2: UserMessageEvent = {
        id: 'note-2',
        timestamp: '2024-01-01T02:00:00.000Z',
        type: TimelineEventType.user_message,
        user: analystA,
        message: 'second note',
      };
      const persistedEvents = [...roundsToTimelineEvents([agentRound], testUser, testAgentId), note1, note2];
      const legacyRounds = timelineEventsToRounds(persistedEvents);

      const merged = mergeLegacyRoundsWithPersistedEvents({
        legacyRounds,
        persistedEvents,
        user: testUser,
        agentId: testAgentId,
      });
      const humanNotes = timelineEventsToActivityEntries(merged).flatMap((entry) =>
        entry.type === 'round' && isHumanNoteRound(entry.round) ? [entry.round.input.message] : []
      );

      expect(humanNotes).toEqual(['first note', 'second note']);
    });
  });

  describe('timelineEventsToRounds', () => {
    it('converts empty events to empty rounds', () => {
      const rounds = timelineEventsToRounds([]);
      expect(rounds).toEqual([]);
    });

    it('pairs user_message with following agent_execution into a round', () => {
      const events = roundsToTimelineEvents([createTestRound()], testUser, testAgentId);
      const rounds = timelineEventsToRounds(events);

      expect(rounds).toHaveLength(1);
      expect(rounds[0].id).toBe('round-1');
      expect(rounds[0].input.message).toBe('hello');
      expect(rounds[0].response.message).toBe('world');
      expect(rounds[0].model_usage.input_tokens).toBe(10);
    });

    it('handles agent_execution without preceding user_message', () => {
      const agentEvent: AgentExecutionEvent = {
        id: 'resp-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        type: TimelineEventType.agentExecution,
        agent_id: testAgentId,
        status: ConversationRoundStatus.completed,
        steps: [],
        response: { message: 'orphan' },
        started_at: '2024-01-01T00:00:00.000Z',
        time_to_first_token: 0,
        time_to_last_token: 0,
        model_usage: {
          connector_id: '',
          llm_calls: 0,
          input_tokens: 0,
          output_tokens: 0,
        },
      };

      const rounds = timelineEventsToRounds([agentEvent]);
      expect(rounds).toHaveLength(1);
      expect(rounds[0].input.message).toBe('');
    });
  });

  describe('timelineEventsToRoundEntries', () => {
    it('creates orphan human-note entry when no agent execution follows', () => {
      const analystA = { id: 'user-a', username: 'analyst_a' };
      const events = [
        {
          id: 'msg-1',
          timestamp: '2024-01-01T00:00:00.000Z',
          type: TimelineEventType.user_message,
          user: analystA,
          message: 'triage note',
        },
      ] as const;

      const entries = timelineEventsToRoundEntries([...events]);

      expect(entries).toHaveLength(1);
      expect(entries[0].author).toEqual(analystA);
      expect(isHumanNoteRound(entries[0].round)).toBe(true);
      expect(entries[0].round.input.message).toBe('triage note');
    });

    it('pairs user message author with agent execution round', () => {
      const analystB = { id: 'user-b', username: 'analyst_b' };
      const events = roundsToTimelineEvents(
        [createTestRound({ input: { message: '@agent summarize' } })],
        analystB,
        testAgentId
      );

      const entries = timelineEventsToRoundEntries(events);

      expect(entries).toHaveLength(1);
      expect(entries[0].author).toEqual(analystB);
      expect(isHumanNoteRound(entries[0].round)).toBe(false);
    });

    it('preserves multiple consecutive human notes as separate entries', () => {
      const analystA = { id: 'user-a', username: 'analyst_a' };
      const events = [
        {
          id: 'msg-1',
          timestamp: '2024-01-01T00:00:00.000Z',
          type: TimelineEventType.user_message,
          user: analystA,
          message: 'first note',
        },
        {
          id: 'msg-2',
          timestamp: '2024-01-01T00:01:00.000Z',
          type: TimelineEventType.user_message,
          user: analystA,
          message: 'second note',
        },
      ] as const;

      const entries = timelineEventsToRoundEntries([...events]);

      expect(entries).toHaveLength(2);
      expect(entries[0].round.input.message).toBe('first note');
      expect(entries[1].round.input.message).toBe('second note');
      expect(timelineEventsToActivityEntries([...events])).toHaveLength(2);
    });
  });

  describe('conversationToTimelineConversation', () => {
    it('converts a conversation to TimelineConversation', () => {
      const conversation: Conversation = {
        id: 'conv-1',
        agent_id: testAgentId,
        user: testUser,
        title: 'test',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        rounds: [createTestRound()],
      };

      const exec = conversationToTimelineConversation(conversation);

      expect(exec.id).toBe('conv-1');
      expect(exec.events).toHaveLength(2);
      expect(exec.events[0].type).toBe('user_message');
      expect(exec.events[1].type).toBe('agent_execution');
    });

    it('prefers persisted events over rounds when present', () => {
      const analystB = { id: 'user-b', username: 'analyst_b' };
      const conversation: Conversation = {
        id: 'conv-1',
        agent_id: testAgentId,
        user: testUser,
        title: 'test',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        rounds: [createTestRound()],
        events: [
          {
            id: 'msg-1',
            timestamp: '2024-01-01T00:00:00.000Z',
            type: TimelineEventType.user_message,
            user: analystB,
            message: 'from persisted events',
          },
        ],
      };

      const exec = conversationToTimelineConversation(conversation);

      expect(exec.events).toHaveLength(1);
      expect((exec.events[0] as UserMessageEvent).message).toBe('from persisted events');
      expect((exec.events[0] as UserMessageEvent).user.username).toBe('analyst_b');
    });
  });

  describe('resolveConversationEvents', () => {
    it('prefers persisted events on a rounds-based Conversation', () => {
      const analystB = { id: 'user-b', username: 'analyst_b' };
      const conversation: Conversation = {
        id: 'conv-1',
        agent_id: testAgentId,
        user: testUser,
        title: 'test',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        rounds: [createTestRound()],
        events: [
          {
            id: 'msg-1',
            timestamp: '2024-01-01T00:00:00.000Z',
            type: TimelineEventType.user_message,
            user: analystB,
            message: 'from persisted events',
          },
        ],
      };

      const events = resolveConversationEvents(conversation);

      expect(events).toHaveLength(1);
      expect((events[0] as UserMessageEvent).user.username).toBe('analyst_b');
    });

    it('returns an empty array when timeline conversation events are missing', () => {
      const timelineConversation = {
        id: 'conv-1',
        agent_id: testAgentId,
        user: testUser,
        title: 'test',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      } as TimelineConversation;

      expect(resolveConversationEvents(timelineConversation)).toEqual([]);
    });
  });

  describe('timelineConversationToConversation', () => {
    it('round-trips correctly', () => {
      const original: Conversation = {
        id: 'conv-1',
        agent_id: testAgentId,
        user: testUser,
        title: 'test',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        rounds: [createTestRound()],
      };

      const exec = conversationToTimelineConversation(original);
      const restored = timelineConversationToConversation(exec);

      expect(restored.id).toBe(original.id);
      expect(restored.rounds).toHaveLength(1);
      expect(restored.rounds[0].input.message).toBe('hello');
      expect(restored.rounds[0].response.message).toBe('world');
    });
  });

  describe('timelineEventsToActivityEntries', () => {
    it('interleaves user_action audit rows with chat rounds in order', () => {
      const userMsg: UserMessageEvent = {
        id: 'msg-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        type: TimelineEventType.user_message,
        user: testUser,
        message: 'note',
      };
      const auditEvent = {
        id: 'ua-1',
        timestamp: '2024-01-01T00:01:00.000Z',
        type: TimelineEventType.user_action as const,
        user: testUser,
        action: UserActionType.field_changed,
        payload: { field: 'severity', previous_value: 'low', new_value: 'high' },
      };

      const entries = timelineEventsToActivityEntries([userMsg, auditEvent]);

      expect(entries).toHaveLength(2);
      expect(entries[0].type).toBe('round');
      expect(entries[1]).toEqual({ type: 'user_action', event: auditEvent });
      expect(timelineEventsToRoundEntries([userMsg, auditEvent])).toHaveLength(1);
    });
  });

  describe('agentExecutionEventToRound', () => {
    it('converts agent execution event to round with user message', () => {
      const userMsg: UserMessageEvent = {
        id: 'msg-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        type: TimelineEventType.user_message,
        user: testUser,
        message: 'hi',
      };
      const agentResp: AgentExecutionEvent = {
        id: 'resp-1',
        timestamp: '2024-01-01T00:00:00.000Z',
        type: TimelineEventType.agentExecution,
        agent_id: testAgentId,
        status: ConversationRoundStatus.completed,
        steps: [],
        response: { message: 'hey' },
        started_at: '2024-01-01T00:00:00.000Z',
        time_to_first_token: 50,
        time_to_last_token: 200,
        model_usage: {
          connector_id: 'c1',
          llm_calls: 1,
          input_tokens: 5,
          output_tokens: 10,
        },
      };

      const round = agentExecutionEventToRound(agentResp, userMsg);
      expect(round.id).toBe('resp-1');
      expect(round.input.message).toBe('hi');
      expect(round.response.message).toBe('hey');
    });
  });
});
