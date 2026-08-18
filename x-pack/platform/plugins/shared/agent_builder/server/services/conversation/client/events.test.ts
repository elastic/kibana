/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  Conversation,
  ConversationRound,
  TimelineEvent,
  TimelineEventInput,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
} from '@kbn/agent-builder-common';
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

const makeDoc = (
  events: TimelineEvent[] = [],
  { schemaVersion }: { schemaVersion?: number } = {}
) => ({
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
    ...(schemaVersion !== undefined ? { schema_version: schemaVersion } : {}),
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
      user,
      isAdmin: false,
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
      // Appending marks the conversation events-native in the same atomic update.
      expect(arg.script.source).toContain('ctx._source.schema_version');
      expect(arg.script.params.schema_version).toBe(1);
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
      mockStorageClient.search.mockResolvedValue({
        hits: { hits: [makeDoc(storedEvents, { schemaVersion: 1 })] },
      });
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

    it('defaults to an empty timeline when an events-native doc has no events array', async () => {
      const doc = makeDoc([], { schemaVersion: 1 });
      delete (doc._source as { events?: unknown }).events;
      mockStorageClient.search.mockResolvedValue({ hits: { hits: [doc] } });
      expect(await client.getEvents('conv-1')).toEqual([]);
    });

    it('converts legacy rounds when the conversation is not events-native (no schema_version)', async () => {
      const doc = makeDoc();
      delete (doc._source as { events?: unknown }).events;
      (doc._source as { conversation_rounds: unknown[] }).conversation_rounds = [
        {
          id: 'r1',
          status: 'completed',
          input: { message: 'hi' },
          steps: [],
          response: { message: 'yo' },
          started_at: '2026-01-01T00:00:00.000Z',
        },
      ];
      mockStorageClient.search.mockResolvedValue({ hits: { hits: [doc] } });

      const events = await client.getEvents('conv-1');
      expect(events.map((e) => [e.id, e.type])).toEqual([
        ['r1::user_message', TimelineEventType.userMessage],
        ['r1::execution_completed', TimelineEventType.executionCompleted],
      ]);
    });

    it('converts legacy rounds even when a stale events array is present but schema_version is absent', async () => {
      // schema_version, not events-presence, is the events-native gate (Pierre's :584).
      const doc = makeDoc(storedEvents);
      (doc._source as { conversation_rounds: unknown[] }).conversation_rounds = [
        {
          id: 'r1',
          status: 'completed',
          input: { message: 'hi' },
          steps: [],
          response: { message: 'yo' },
          started_at: '2026-01-01T00:00:00.000Z',
        },
      ];
      mockStorageClient.search.mockResolvedValue({ hits: { hits: [doc] } });

      const events = await client.getEvents('conv-1');
      expect(events.map((e) => e.id)).toEqual(['r1::user_message', 'r1::execution_completed']);
    });
  });

  describe('whole-doc writes preserve the timeline (P2.0)', () => {
    const storedEvent: TimelineEvent = {
      id: 'e1',
      type: TimelineEventType.userMessage,
      created_at: '2026-01-01T00:00:00.000Z',
      actor: { type: EventActorType.user, id: 'user-1' },
      data: { message: 'hi' },
    };
    const activeExecution = {
      execution_id: 'exec-1',
      trigger_event_id: 'e1',
      started_at: '2026-01-01T00:00:00.000Z',
    };

    beforeEach(() => {
      mockStorageClient.index.mockResolvedValue({ _seq_no: 2, _primary_term: 1 });
    });

    it('keeps events/active_execution/schema_version when a field is updated', async () => {
      const doc = makeDoc([storedEvent]);
      const docWithFields = {
        ...doc,
        _source: { ...doc._source, schema_version: 1, active_execution: activeExecution },
      };
      mockStorageClient.search.mockResolvedValue({ hits: { hits: [docWithFields] } });

      await client.update({ id: 'conv-1', title: 'New title' });

      const indexed = mockStorageClient.index.mock.calls[0][0].document;
      expect(indexed.title).toBe('New title');
      expect(indexed.events).toEqual([storedEvent]);
      expect(indexed.schema_version).toBe(1);
      expect(indexed.active_execution).toEqual(activeExecution);
    });

    it('does not introduce the fields when the stored doc lacks them', async () => {
      const doc = makeDoc();
      delete (doc._source as { events?: unknown }).events;
      mockStorageClient.search.mockResolvedValue({ hits: { hits: [doc] } });

      await client.update({ id: 'conv-1', title: 'New title' });

      const indexed = mockStorageClient.index.mock.calls[0][0].document;
      expect('events' in indexed).toBe(false);
      expect('schema_version' in indexed).toBe(false);
      expect('active_execution' in indexed).toBe(false);
    });
  });

  describe('appendRoundTimelineEvents (producer)', () => {
    const conversation = {
      id: 'conv-1',
      agent_id: 'agent-1',
      user: { id: 'user-1', username: 'alice' },
      title: 'T',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      rounds: [],
    } as unknown as Conversation;

    const round = (overrides: Partial<ConversationRound> = {}) =>
      ({
        id: 'round-1',
        status: ConversationRoundStatus.completed,
        input: { message: 'hello' },
        steps: [],
        response: { message: 'hi' },
        started_at: '2026-01-01T00:00:00.000Z',
        time_to_first_token: 1,
        time_to_last_token: 2,
        model_usage: { connector_id: 'c', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
        ...overrides,
      } as ConversationRound);

    const appendedEvents = (): TimelineEvent[] =>
      esClient.update.mock.calls[0][0].script.params.new_events;

    const storedEvent: TimelineEvent = {
      id: 'e0',
      type: TimelineEventType.userMessage,
      created_at: '2026-01-01T00:00:00.000Z',
      actor: { type: EventActorType.user, id: 'user-1' },
      data: { message: 'earlier' },
    };

    it('appends user_message + execution_started + execution_completed for a new conversation', async () => {
      await client.appendRoundTimelineEvents(conversation, round(), {
        resumed: false,
        created: true,
      });

      const events = appendedEvents();
      expect(events.map((e) => e.type)).toEqual([
        TimelineEventType.userMessage,
        TimelineEventType.executionStarted,
        TimelineEventType.executionCompleted,
      ]);
      const [userMessage, started, completed] = events;
      expect(userMessage.actor).toMatchObject({ type: EventActorType.user, id: 'user-1' });
      expect(started.actor).toMatchObject({ type: EventActorType.agent, id: 'agent-1' });
      // linkage: the run points back at the user message and shares one execution id
      expect(started.trigger_event_id).toBe(userMessage.id);
      expect(completed.trigger_event_id).toBe(userMessage.id);
      expect(started.execution_id).toBe(completed.execution_id);
    });

    it('appends on an update when the conversation is already events-native', async () => {
      mockStorageClient.search.mockResolvedValue({
        hits: { hits: [makeDoc([storedEvent], { schemaVersion: 1 })] },
      });

      await client.appendRoundTimelineEvents(conversation, round(), {
        resumed: false,
        created: false,
      });

      expect(appendedEvents().map((e) => e.type)).toEqual([
        TimelineEventType.userMessage,
        TimelineEventType.executionStarted,
        TimelineEventType.executionCompleted,
      ]);
    });

    it('appends nothing on an update to a legacy conversation (no schema_version)', async () => {
      // default search mock returns makeDoc() with no schema_version
      await client.appendRoundTimelineEvents(conversation, round(), {
        resumed: false,
        created: false,
      });
      expect(esClient.update).not.toHaveBeenCalled();
    });

    it('appends nothing on an update when a stale events array exists but schema_version is absent', async () => {
      // Guards the migrate-on-write rule: events-presence must not trigger a partial append.
      mockStorageClient.search.mockResolvedValue({ hits: { hits: [makeDoc([storedEvent])] } });

      await client.appendRoundTimelineEvents(conversation, round(), {
        resumed: false,
        created: false,
      });
      expect(esClient.update).not.toHaveBeenCalled();
    });

    it('appends nothing for a paused (awaiting_prompt) round — HITL is a follow-up', async () => {
      await client.appendRoundTimelineEvents(
        conversation,
        round({ status: ConversationRoundStatus.awaitingPrompt, pending_prompts: [] }),
        { resumed: false, created: true }
      );
      expect(esClient.update).not.toHaveBeenCalled();
    });

    it('appends nothing for a resumed round — HITL is a follow-up', async () => {
      await client.appendRoundTimelineEvents(conversation, round(), {
        resumed: true,
        created: false,
      });
      expect(esClient.update).not.toHaveBeenCalled();
    });

    it('is best-effort: a failed append is swallowed, not thrown', async () => {
      esClient.update.mockRejectedValueOnce(new Error('es down'));
      await expect(
        client.appendRoundTimelineEvents(conversation, round(), { resumed: false, created: true })
      ).resolves.toBeUndefined();
    });
  });
});
