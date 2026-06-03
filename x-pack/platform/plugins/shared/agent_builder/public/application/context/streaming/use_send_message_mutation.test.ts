/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventType, type Conversation } from '@kbn/agent-builder-common';
import {
  appendOptimisticHumanNoteToConversation,
  mergeAppendMessageResponseIntoConversation,
} from './use_send_message_mutation';

describe('mergeAppendMessageResponseIntoConversation', () => {
  const baseConversation: Conversation = {
    id: 'conversation-1',
    agent_id: 'agent-1',
    user: { id: 'owner', username: 'owner' },
    title: 'Investigation',
    created_at: '2026-06-02T00:00:00.000Z',
    updated_at: '2026-06-02T00:00:00.000Z',
    rounds: [],
    events: [
      {
        id: 'existing-event',
        timestamp: '2026-06-02T00:00:00.000Z',
        type: TimelineEventType.user_message,
        user: { id: 'owner', username: 'owner' },
        message: 'Initial note',
      },
    ],
  };

  it('appends the new user message event to the cached conversation', () => {
    const merged = mergeAppendMessageResponseIntoConversation(baseConversation, {
      conversation_id: 'conversation-1',
      event: {
        id: 'new-event',
        timestamp: '2026-06-02T01:00:00.000Z',
        type: TimelineEventType.user_message,
        user: { id: 'elastic', username: 'elastic' },
        message: 'Follow-up note',
      },
    });

    expect(merged?.events).toHaveLength(2);
    expect(merged?.events?.[0]?.message).toBe('Initial note');
    expect(merged?.events?.[1]?.message).toBe('Follow-up note');
    expect(merged?.rounds).toHaveLength(2);
    expect(merged?.rounds?.[0]?.input.message).toBe('Initial note');
    expect(merged?.rounds?.[1]?.input.message).toBe('Follow-up note');
    expect(merged?.updated_at).toBe('2026-06-02T01:00:00.000Z');
  });

  it('shows an optimistic human note before the server responds', () => {
    const optimistic = appendOptimisticHumanNoteToConversation(baseConversation, 'Draft note');

    expect(optimistic?.events?.some((event) => event.message === 'Draft note')).toBe(true);
    expect(optimistic?.rounds?.some((round) => round.input.message === 'Draft note')).toBe(true);
  });

  it('replaces optimistic notes with the persisted server event', () => {
    const optimistic = appendOptimisticHumanNoteToConversation(baseConversation, 'Draft note');
    const merged = mergeAppendMessageResponseIntoConversation(optimistic, {
      conversation_id: 'conversation-1',
      event: {
        id: 'new-event',
        timestamp: '2026-06-02T01:00:00.000Z',
        type: TimelineEventType.user_message,
        user: { id: 'elastic', username: 'elastic' },
        message: 'Draft note',
      },
    });

    expect(merged?.events?.some((event) => event.id.startsWith('optimistic-human-note-'))).toBe(
      false
    );
    expect(merged?.events?.some((event) => event.id === 'new-event')).toBe(true);
  });

  it('deduplicates an event that was already merged', () => {
    const merged = mergeAppendMessageResponseIntoConversation(baseConversation, {
      conversation_id: 'conversation-1',
      event: baseConversation.events![0],
    });

    expect(merged?.events).toHaveLength(1);
    expect(merged?.events?.[0]?.id).toBe('existing-event');
  });

  it('returns undefined when there is no cached conversation', () => {
    expect(
      mergeAppendMessageResponseIntoConversation(undefined, {
        conversation_id: 'conversation-1',
        event: {
          id: 'new-event',
          timestamp: '2026-06-02T01:00:00.000Z',
          type: TimelineEventType.user_message,
          user: { id: 'elastic', username: 'elastic' },
          message: 'Follow-up note',
        },
      })
    ).toBeUndefined();
  });
});
