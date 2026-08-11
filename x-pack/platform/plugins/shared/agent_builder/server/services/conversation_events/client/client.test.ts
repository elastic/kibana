/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CurrentUser, TimelineEvent } from '@kbn/agent-builder-common';
import {
  CONVERSATION_SCHEMA_VERSION,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';
import { createClient, type ConversationEventsClient, type TimelineEventInput } from './client';

let uuidCounter = 0;
jest.mock('uuid', () => ({ v4: () => `generated-uuid-${(uuidCounter += 1)}` }));

interface MockEsClient {
  index: jest.Mock;
  update: jest.Mock;
  get: jest.Mock;
}

const mockEsClient: MockEsClient = {
  index: jest.fn(),
  update: jest.fn(),
  get: jest.fn(),
};

jest.mock('../../conversation/client/storage', () => ({
  conversationIndexName: '.chat-conversations',
  createStorage: jest.fn(() => ({ getClient: () => mockEsClient })),
}));

const user: CurrentUser = { id: 'user-1', username: 'alice' };

const userMessage = (message: string): TimelineEventInput => ({
  type: TimelineEventType.userMessage,
  data: { message },
});

describe('ConversationEventsClient', () => {
  let client: ConversationEventsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient.update.mockResolvedValue({ result: 'updated' });
    mockEsClient.index.mockResolvedValue({ result: 'created' });
    client = createClient({
      space: 'default',
      logger: loggerMock.create(),
      esClient: mockEsClient as unknown as ElasticsearchClient,
      user,
    });
  });

  describe('appendEvents', () => {
    it('is a no-op for an empty list', async () => {
      const result = await client.appendEvents('conv-1', []);
      expect(result).toEqual([]);
      expect(mockEsClient.update).not.toHaveBeenCalled();
    });

    it('stamps id, created_at, and the default actor onto new events', async () => {
      const [event] = await client.appendEvents('conv-1', [userMessage('hi')]);

      expect(event.id).toEqual(expect.any(String));
      expect(event.created_at).toEqual(expect.any(String));
      expect(event.actor).toEqual({ type: EventActorType.user, id: 'user-1', username: 'alice' });
      expect(event.type).toBe(TimelineEventType.userMessage);
    });

    it('preserves caller-supplied id, created_at, and actor', async () => {
      const supplied: TimelineEventInput = {
        id: 'evt-fixed',
        created_at: '2026-01-01T00:00:00.000Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        type: TimelineEventType.executionStarted,
        data: { trigger_type: TimelineTriggerType.userMessage },
      };

      const [event] = await client.appendEvents('conv-1', [supplied]);

      expect(event.id).toBe('evt-fixed');
      expect(event.created_at).toBe('2026-01-01T00:00:00.000Z');
      expect(event.actor).toEqual({ type: EventActorType.agent, id: 'agent-1' });
    });

    it('issues an atomic scripted append with retry_on_conflict', async () => {
      const stamped = await client.appendEvents('conv-1', [userMessage('a'), userMessage('b')]);

      expect(mockEsClient.update).toHaveBeenCalledTimes(1);
      const arg = mockEsClient.update.mock.calls[0][0];
      expect(arg).toEqual(
        expect.objectContaining({
          index: '.chat-conversations',
          id: 'conv-1',
          retry_on_conflict: 5,
        })
      );
      expect(arg.script.source).toContain('ctx._source.events.add');
      expect(arg.script.params.new_events).toEqual(stamped);
    });

    it('issues an independent scripted update per concurrent append (no whole-doc rewrite)', async () => {
      await Promise.all([
        client.appendEvents('conv-1', [userMessage('a')]),
        client.appendEvents('conv-1', [userMessage('b')]),
      ]);

      expect(mockEsClient.update).toHaveBeenCalledTimes(2);
      for (const call of mockEsClient.update.mock.calls) {
        expect(call[0].retry_on_conflict).toBe(5);
        expect(call[0].script.source).toContain('ctx._source.events.add');
      }
      // Neither append re-indexes the whole document (that is the rounds path's lost-update bug).
      expect(mockEsClient.index).not.toHaveBeenCalled();
    });
  });

  describe('getEvents', () => {
    const storedEvents: TimelineEvent[] = [
      {
        id: 'e1',
        type: TimelineEventType.userMessage,
        created_at: '2026-01-01T00:00:00.000Z',
        actor: { type: EventActorType.user, id: 'user-1' },
        data: { message: 'one' },
      },
      {
        id: 'e2',
        type: TimelineEventType.userMessage,
        created_at: '2026-01-01T00:00:01.000Z',
        actor: { type: EventActorType.user, id: 'user-1' },
        data: { message: 'two' },
      },
      {
        id: 'e3',
        type: TimelineEventType.userMessage,
        created_at: '2026-01-01T00:00:02.000Z',
        actor: { type: EventActorType.user, id: 'user-1' },
        data: { message: 'three' },
      },
    ];

    beforeEach(() => {
      mockEsClient.get.mockResolvedValue({ _source: { events: storedEvents } });
    });

    it('returns the whole timeline in order', async () => {
      const events = await client.getEvents('conv-1');
      expect(events.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    });

    it('returns only events after afterEventId', async () => {
      const events = await client.getEvents('conv-1', { afterEventId: 'e1' });
      expect(events.map((e) => e.id)).toEqual(['e2', 'e3']);
    });

    it('applies limit after afterEventId', async () => {
      const events = await client.getEvents('conv-1', { afterEventId: 'e1', limit: 1 });
      expect(events.map((e) => e.id)).toEqual(['e2']);
    });

    it('defaults to an empty timeline when the events field is absent', async () => {
      mockEsClient.get.mockResolvedValueOnce({ _source: {} });
      expect(await client.getEvents('conv-1')).toEqual([]);
    });

    it('throws when the conversation does not exist', async () => {
      mockEsClient.get.mockRejectedValueOnce({ meta: { statusCode: 404 } });
      await expect(client.getEvents('missing')).rejects.toThrow('Conversation missing not found');
    });
  });

  describe('create', () => {
    it('writes an events-native document with op_type create', async () => {
      const { id } = await client.create({ id: 'conv-new', agentId: 'agent-1', title: 'T' });

      expect(id).toBe('conv-new');
      expect(mockEsClient.index).toHaveBeenCalledTimes(1);
      const arg = mockEsClient.index.mock.calls[0][0];
      expect(arg.op_type).toBe('create');
      expect(arg.id).toBe('conv-new');
      expect(arg.document).toEqual(
        expect.objectContaining({
          agent_id: 'agent-1',
          title: 'T',
          user_name: 'alice',
          schema_version: CONVERSATION_SCHEMA_VERSION,
          events: [],
          conversation_rounds: [],
        })
      );
    });

    it('generates an id when none is supplied', async () => {
      const { id } = await client.create({ agentId: 'agent-1' });
      expect(id).toEqual(expect.any(String));
      expect(id.length).toBeGreaterThan(0);
    });
  });
});
