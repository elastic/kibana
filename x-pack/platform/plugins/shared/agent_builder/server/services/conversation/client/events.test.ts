/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { TimelineEvent, TimelineEventInput } from '@kbn/agent-builder-common';
import { EventActorType, TimelineEventType, TimelineTriggerType } from '@kbn/agent-builder-common';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common/chat/access_control';
import type { AgentRegistry } from '../../agents/agent_registry';
import { createClient, type ConversationClient } from './client';

let uuidCounter = 0;
jest.mock('uuid', () => ({ v4: () => `generated-uuid-${(uuidCounter += 1)}` }));

const testSpace = 'default';
const user = { id: 'user-1', username: 'alice' };

interface MockStorageClient {
  search: jest.Mock;
  index: jest.Mock;
  delete: jest.Mock;
}
const mockStorageClient: MockStorageClient = {
  search: jest.fn(),
  index: jest.fn(),
  delete: jest.fn(),
};

jest.mock('./storage', () => ({
  conversationIndexName: '.chat-conversations',
  createStorage: jest.fn(() => ({ getClient: () => mockStorageClient })),
}));

const esClient = { update: jest.fn(), get: jest.fn() };

const makeDoc = (events: TimelineEvent[] = []) => ({
  _id: 'conv-1',
  _seq_no: 1,
  _primary_term: 1,
  _source: {
    agent_id: 'agent-1',
    user_id: user.id,
    user_name: user.username,
    space: testSpace,
    title: 'T',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    access_control: { access_mode: ConversationAccessControlMode.Private },
    conversation_rounds: [],
    events,
  },
});

const userMessage = (message: string): TimelineEventInput => ({
  type: TimelineEventType.userMessage,
  data: { message },
});

describe('ConversationClient timeline events', () => {
  let client: ConversationClient;
  let agentRegistry: jest.Mocked<Pick<AgentRegistry, 'get' | 'getIds'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    agentRegistry = {
      get: jest.fn().mockResolvedValue({}),
      getIds: jest.fn().mockResolvedValue(['agent-1']),
    } as unknown as jest.Mocked<Pick<AgentRegistry, 'get' | 'getIds'>>;
    esClient.update.mockResolvedValue({ result: 'updated' });
    mockStorageClient.search.mockResolvedValue({ hits: { hits: [makeDoc()] } });
    client = createClient({
      space: testSpace,
      logger: loggerMock.create(),
      esClient: esClient as unknown as ElasticsearchClient,
      user: { ...user, isAdmin: false },
      agentRegistry: agentRegistry as unknown as AgentRegistry,
    });
  });

  describe('appendEvents', () => {
    it('is a no-op for an empty list', async () => {
      expect(await client.appendEvents('conv-1', [])).toEqual([]);
      expect(esClient.update).not.toHaveBeenCalled();
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
      expect(event.actor).toEqual({ type: EventActorType.agent, id: 'agent-1' });
    });

    it('issues an atomic scripted append with retry_on_conflict, not a whole-document rewrite', async () => {
      const stamped = await client.appendEvents('conv-1', [userMessage('a'), userMessage('b')]);

      expect(esClient.update).toHaveBeenCalledTimes(1);
      const arg = esClient.update.mock.calls[0][0];
      expect(arg).toEqual(
        expect.objectContaining({
          index: '.chat-conversations',
          id: 'conv-1',
          retry_on_conflict: 5,
        })
      );
      expect(arg.script.source).toContain('ctx._source.events.add');
      expect(arg.script.params.new_events).toEqual(stamped);
      // The whole-document round path (storage index) is never used for an append.
      expect(mockStorageClient.index).not.toHaveBeenCalled();
    });

    it('rejects when the caller cannot access the conversation', async () => {
      mockStorageClient.search.mockResolvedValue({ hits: { hits: [] } });
      await expect(client.appendEvents('missing', [userMessage('hi')])).rejects.toThrow();
      expect(esClient.update).not.toHaveBeenCalled();
    });
  });

  describe('getEvents', () => {
    const storedEvents: TimelineEvent[] = ['e1', 'e2', 'e3'].map((id, i) => ({
      id,
      type: TimelineEventType.userMessage,
      created_at: `2026-01-01T00:00:0${i}.000Z`,
      actor: { type: EventActorType.user, id: 'user-1' },
      data: { message: id },
    }));

    beforeEach(() => {
      mockStorageClient.search.mockResolvedValue({ hits: { hits: [makeDoc(storedEvents)] } });
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

    it('throws on an unknown afterEventId instead of returning the whole timeline', async () => {
      await expect(client.getEvents('conv-1', { afterEventId: 'nope' })).rejects.toThrow(
        /afterEventId "nope" was not found/
      );
    });

    it('defaults to an empty timeline when the events field is absent', async () => {
      const doc = makeDoc();
      delete (doc._source as { events?: unknown }).events;
      mockStorageClient.search.mockResolvedValue({ hits: { hits: [doc] } });
      expect(await client.getEvents('conv-1')).toEqual([]);
    });
  });
});
