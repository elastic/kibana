/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationAccessControlMode,
  ConversationRoundStatus,
  ConversationOriginType,
  createAgentNotFoundError,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createMockedAgentRegistry } from '../../../test_utils/agents';
import { createClient } from './client';
import { toEs } from './converters';
import type { ConversationProperties } from './storage';
import type { AppendUserMessageRequest } from './types';

const mockIndex = jest.fn();
jest.mock('./storage', () => ({
  conversationIndexName: '.kibana_agent_builder_conversations',
  createStorage: () => ({ getClient: () => ({ index: mockIndex }) }),
}));

const textType: AttachmentTypeDefinition = {
  id: 'text',
  validate: (data) => ({ valid: true, data }),
  format: () => ({ getRepresentation: () => ({ type: 'text', value: 'context' }) }),
};

const initialConversation = {
  id: 'conversation',
  agent_id: 'agent',
  title: 'New conversation',
  user: { id: 'user', username: 'alice' },
  rounds: [],
  events: [],
  schema_version: CONVERSATION_SCHEMA_VERSION,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  access_control: { access_mode: ConversationAccessControlMode.Private, entries: [] },
};

const request = (messageId: string): AppendUserMessageRequest => ({
  id: 'conversation',
  messageId,
  message: messageId,
  createdAt: new Date().toISOString(),
  attachments: [],
  getTypeDefinition: () => textType,
});

describe('appendUserMessage', () => {
  const es = elasticsearchServiceMock.createElasticsearchClient();
  const agentRegistry = createMockedAgentRegistry();
  let stored: ConversationProperties;
  let version: number;
  const client = createClient({
    esClient: es,
    user: { ...initialConversation.user, isAdmin: false },
    space: 'default',
    logger: loggerMock.create(),
    agentRegistry,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    stored = toEs(initialConversation, 'default');
    version = 0;
    es.get.mockImplementation(async () => ({
      found: true,
      _id: 'conversation',
      _index: 'index',
      _source: structuredClone(stored),
      _seq_no: version,
      _primary_term: 1,
    }));
    mockIndex.mockImplementation(
      async ({ document, if_seq_no: expectedVersion, op_type: opType }) => {
        if (opType === 'create' || expectedVersion !== version) {
          throw Object.assign(new Error('conflict'), { statusCode: 409 });
        }
        stored = structuredClone(document);
        version++;
        return { _seq_no: version, _primary_term: 1 };
      }
    );
  });

  it('atomically appends messages and attachments, without projecting rounds', async () => {
    await client.appendUserMessage({
      ...request('m1'),
      attachments: [{ id: 'a1', type: 'text', data: { text: 'context' } }],
    });
    const conversation = await client.get('conversation');
    expect(conversation.rounds).toEqual([]);
    expect(conversation.events).toEqual([
      expect.objectContaining({
        id: 'm1',
        type: TimelineEventType.userMessage,
        actor: { type: 'user', id: 'user', username: 'alice' },
        data: {
          message: 'm1',
          attachment_refs: [expect.objectContaining({ attachment_id: 'a1', version: 1 })],
        },
      }),
    ]);
    expect(conversation.attachments).toHaveLength(1);
    expect(mockIndex).toHaveBeenCalledTimes(1);
    expect(agentRegistry.get).toHaveBeenCalledWith('agent', { access: 'use' });
  });

  it('merges concurrent appends and checks replay identity against the fresh snapshot', async () => {
    await Promise.all([
      client.appendUserMessage(request('m1')),
      client.appendUserMessage(request('m2')),
      client.appendUserMessage(request('m1')),
    ]);
    expect((await client.get('conversation')).events?.map(({ id }) => id).sort()).toEqual([
      'm1',
      'm2',
    ]);
    const writes = mockIndex.mock.calls.length;
    await client.appendUserMessage({
      ...request('m1'),
      attachments: [{ type: 'text', data: { text: 'changed replay' } }],
    });
    expect(mockIndex).toHaveBeenCalledTimes(writes);
    expect((await client.get('conversation')).attachments ?? []).toEqual([]);
  });

  it('preserves messages across metadata writes and execution completion', async () => {
    await client.appendUserMessage(request('m1'));
    await client.update({ id: 'conversation', title: 'Updated' });
    await client.replaceRoundEvents({
      id: 'conversation',
      roundId: 'round',
      events: [],
      status: ConversationRoundStatus.completed,
    });
    expect((await client.get('conversation')).events?.map(({ id }) => id)).toEqual(['m1']);
  });

  it('rejects read-only and cross-space writes', async () => {
    stored.read_only = true;
    await expect(client.appendUserMessage(request('m1'))).rejects.toThrow('read-only');
    stored.read_only = false;
    stored.space = 'other';
    await expect(client.appendUserMessage(request('m1'))).rejects.toThrow();
    expect(mockIndex).not.toHaveBeenCalled();
  });

  it('creates the conversation and initial attachments in one write with the authenticated owner', async () => {
    mockIndex.mockImplementationOnce(async ({ document }) => {
      stored = structuredClone(document);
      version++;
      return { _seq_no: version, _primary_term: 1 };
    });
    await client.appendUserMessage({
      ...request('m1'),
      create: { ...initialConversation, user: { id: 'unknown', username: 'unknown' } },
      attachments: [{ id: 'a1', type: 'text', data: { text: 'initial' } }],
      author: { id: 'external-user', full_name: 'Alice Slack' },
      origin: { type: ConversationOriginType.Slack },
    });
    const conversation = await client.get('conversation');
    expect(conversation.user).toEqual(initialConversation.user);
    expect(conversation.schema_version).toBe(CONVERSATION_SCHEMA_VERSION);
    expect(conversation.rounds).toEqual([]);
    expect(conversation.events?.[0].actor).toMatchObject({ type: 'external', id: 'external-user' });
    expect(conversation.attachments).toHaveLength(1);
    expect(mockIndex).toHaveBeenCalledTimes(1);
  });

  it('preserves attachment versions referenced by previous messages', async () => {
    await client.appendUserMessage({
      ...request('m1'),
      attachments: [{ id: 'a1', type: 'text', data: { text: 'one' } }],
    });
    await client.appendUserMessage({
      ...request('m2'),
      attachments: [{ id: 'a1', type: 'text', data: { text: 'two' } }],
    });
    const conversation = await client.get('conversation');
    expect(conversation.attachments?.[0].versions).toHaveLength(2);
    expect(
      conversation.events?.map(
        (event) =>
          event.type === TimelineEventType.userMessage && event.data.attachment_refs?.[0].version
      )
    ).toEqual([1, 2]);
  });

  it('authorizes private/shared writes independently of attribution and checks agent use', async () => {
    stored.user_id = 'other-user';
    await expect(client.appendUserMessage(request('m1'))).rejects.toThrow();
    expect(mockIndex).not.toHaveBeenCalled();
    stored.access_control = { access_mode: ConversationAccessControlMode.Public, entries: [] };
    await client.appendUserMessage(request('m1'));
    agentRegistry.get.mockRejectedValueOnce(createAgentNotFoundError({ agentId: 'agent' }));
    await expect(client.appendUserMessage(request('m2'))).rejects.toThrow();
    expect(mockIndex).toHaveBeenCalledTimes(1);
  });

  it('retries creation races using the same message identity', async () => {
    await client.appendUserMessage({ ...request('m1'), create: initialConversation });
    expect((await client.get('conversation')).events?.map(({ id }) => id)).toEqual(['m1']);
  });
});
