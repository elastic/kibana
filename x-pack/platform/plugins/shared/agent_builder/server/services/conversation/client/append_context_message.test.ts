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
  createAgentNotFoundError,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import type { TimelineEvent } from '@kbn/agent-builder-common';
import type { AttachmentInput, VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createMockedAgentRegistry } from '../../../test_utils/agents';
import { createClient } from './client';
import { toEs } from './converters';
import type { ConversationProperties } from './storage';
import type { AppendContextMessageRequest } from './types';

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

const request = (message: string): AppendContextMessageRequest => ({
  id: 'conversation',
  message,
});

/**
 * Materializes attachment inputs the way callers do, so these tests exercise the same
 * `refs` + snapshot/produced contract the routes pass in.
 */
const materialize = async (
  snapshot: VersionedAttachment[],
  inputs: AttachmentInput[]
): Promise<Pick<AppendContextMessageRequest, 'refs' | 'attachments'>> => {
  const manager = createAttachmentStateManager(snapshot, { getTypeDefinition: () => textType });

  for (const input of inputs) {
    if (input.id && manager.getAttachmentRecord(input.id)) {
      await manager.update(input.id, input, ATTACHMENT_REF_ACTOR.user);
    } else {
      await manager.add(input, ATTACHMENT_REF_ACTOR.user);
    }
  }

  return { refs: manager.getAccessedRefs(), attachments: { snapshot, produced: manager.getAll() } };
};

const messagesOf = (events: TimelineEvent[] = []): string[] =>
  events.flatMap((event) =>
    event.type === TimelineEventType.userMessage ? [event.data.message] : []
  );

describe('appendContextMessage', () => {
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

  const withAttachments = async (
    message: string,
    inputs: AttachmentInput[]
  ): Promise<AppendContextMessageRequest> => ({
    ...request(message),
    ...(await materialize((await client.get('conversation')).attachments ?? [], inputs)),
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
    await client.appendContextMessage(
      await withAttachments('m1', [{ id: 'a1', type: 'text', data: { text: 'context' } }])
    );
    const conversation = await client.get('conversation');
    expect(conversation.rounds).toEqual([]);
    expect(conversation.events).toEqual([
      expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
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

  it('defaults the message and attachments, stamping the event with the current time', async () => {
    const before = Date.now();
    await client.appendContextMessage({ id: 'conversation' });
    const [event] = (await client.get('conversation')).events ?? [];
    expect(event).toEqual(expect.objectContaining({ data: { message: '', attachment_refs: [] } }));
    expect(Date.parse(event.created_at)).toBeGreaterThanOrEqual(before);
  });

  it('merges concurrent appends against the fresh snapshot', async () => {
    await Promise.all([
      client.appendContextMessage(request('m1')),
      client.appendContextMessage(request('m2')),
      client.appendContextMessage(request('m3')),
    ]);
    const conversation = await client.get('conversation');
    expect(messagesOf(conversation.events).sort()).toEqual(['m1', 'm2', 'm3']);
    expect(conversation.events?.map(({ id }) => id)).toHaveLength(3);
  });

  it('preserves messages across metadata writes and execution completion', async () => {
    await client.appendContextMessage(request('m1'));
    await client.update({ id: 'conversation', title: 'Updated' });
    await client.replaceRoundEvents({
      id: 'conversation',
      roundId: 'round',
      events: [],
      status: ConversationRoundStatus.completed,
    });
    expect(messagesOf((await client.get('conversation')).events)).toEqual(['m1']);
  });

  it('appends to read-only conversations, which are only read-only in the UI', async () => {
    stored.read_only = true;
    await client.appendContextMessage(request('m1'));
    expect(messagesOf((await client.get('conversation')).events)).toEqual(['m1']);
  });

  it('rejects cross-space writes', async () => {
    stored.space = 'other';
    await expect(client.appendContextMessage(request('m1'))).rejects.toThrow();
    expect(mockIndex).not.toHaveBeenCalled();
  });

  it('attributes the message to the supplied author', async () => {
    await client.appendContextMessage({
      ...request('m1'),
      author: { id: 'author-user', full_name: 'Alice Author' },
    });
    const conversation = await client.get('conversation');
    expect(conversation.events?.[0].actor).toMatchObject({
      type: 'user',
      id: 'author-user',
      full_name: 'Alice Author',
    });
    expect(mockIndex).toHaveBeenCalledTimes(1);
  });

  it('preserves attachment versions referenced by previous messages', async () => {
    await client.appendContextMessage(
      await withAttachments('m1', [{ id: 'a1', type: 'text', data: { text: 'one' } }])
    );
    await client.appendContextMessage(
      await withAttachments('m2', [{ id: 'a1', type: 'text', data: { text: 'two' } }])
    );
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
    await expect(client.appendContextMessage(request('m1'))).rejects.toThrow();
    expect(mockIndex).not.toHaveBeenCalled();
    stored.access_control = { access_mode: ConversationAccessControlMode.Public, entries: [] };
    await client.appendContextMessage(request('m1'));
    agentRegistry.get.mockRejectedValueOnce(createAgentNotFoundError({ agentId: 'agent' }));
    await expect(client.appendContextMessage(request('m2'))).rejects.toThrow();
    expect(mockIndex).toHaveBeenCalledTimes(1);
  });
});
