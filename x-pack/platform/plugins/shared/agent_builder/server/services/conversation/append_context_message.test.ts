/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  CONVERSATION_SCHEMA_VERSION,
  ConversationAccessControlMode,
  ConversationRoundStatus,
  createAgentNotFoundError,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import type { TimelineEvent } from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import { createMockedAgentRegistry } from '../../test_utils/agents';
import { getUserFromRequest } from '../utils';
import { toEs } from './client/converters';
import type { ConversationProperties } from './client/storage';
import { ConversationServiceImpl } from './conversation_service';

const mockIndex = jest.fn();
jest.mock('./client/storage', () => ({
  conversationIndexName: '.kibana_agent_builder_conversations',
  createStorage: () => ({ getClient: () => ({ index: mockIndex }) }),
}));

jest.mock('../utils');
const getUserFromRequestMock = getUserFromRequest as jest.MockedFunction<typeof getUserFromRequest>;

const textType: AttachmentTypeDefinition = {
  id: 'text',
  validate: (data) => ({ valid: true, data }),
  format: () => ({ getRepresentation: () => ({ type: 'text', value: 'context' }) }),
};

const user = { id: 'user', username: 'alice' };

const initialConversation = {
  id: 'conversation',
  agent_id: 'agent',
  title: 'New conversation',
  user,
  rounds: [],
  events: [],
  schema_version: CONVERSATION_SCHEMA_VERSION,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  access_control: { access_mode: ConversationAccessControlMode.Private, entries: [] },
};

const request = { headers: {} } as unknown as KibanaRequest;

const messagesOf = (events: TimelineEvent[] = []): string[] =>
  events.flatMap((event) =>
    event.type === TimelineEventType.userMessage ? [event.data.message] : []
  );

describe('ConversationService.appendContextMessage', () => {
  const es = elasticsearchServiceMock.createElasticsearchClient();
  const agentRegistry = createMockedAgentRegistry();
  let stored: ConversationProperties;
  let version: number;

  const service = new ConversationServiceImpl({
    logger: loggingSystemMock.createLogger(),
    security: {} as never,
    elasticsearch: {
      client: { asScoped: () => ({ asCurrentUser: es, asInternalUser: es }) },
    } as never,
    agents: { getRegistry: async () => agentRegistry } as never,
    attachments: { getTypeDefinition: () => textType } as never,
  });

  const append = (message: string, attachments?: AttachmentInput[]) =>
    service.appendContextMessage({ request, conversationId: 'conversation', message, attachments });

  const readConversation = async () => {
    const client = await service.getScopedClient({ request });

    return client.get('conversation');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getUserFromRequestMock.mockResolvedValue({ ...user, isAdmin: false });
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
    const conversation = await append('m1', [
      { id: 'a1', type: 'text', data: { text: 'context' } },
    ]);
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
    const conversation = await service.appendContextMessage({
      request,
      conversationId: 'conversation',
    });
    const [event] = conversation.events ?? [];
    expect(event).toEqual(expect.objectContaining({ data: { message: '', attachment_refs: [] } }));
    expect(Date.parse(event.created_at)).toBeGreaterThanOrEqual(before);
  });

  it('merges concurrent appends against the fresh snapshot', async () => {
    await Promise.all([append('m1'), append('m2'), append('m3')]);
    const conversation = await readConversation();
    expect(messagesOf(conversation.events).sort()).toEqual(['m1', 'm2', 'm3']);
    expect(conversation.events?.map(({ id }) => id)).toHaveLength(3);
  });

  it('preserves messages across metadata writes and execution completion', async () => {
    await append('m1');
    const client = await service.getScopedClient({ request });
    await client.update({ id: 'conversation', title: 'Updated' });
    await client.replaceRoundEvents({
      id: 'conversation',
      roundId: 'round',
      events: [],
      status: ConversationRoundStatus.completed,
    });
    expect(messagesOf((await readConversation()).events)).toEqual(['m1']);
  });

  it('appends to read-only conversations, which are only read-only in the UI', async () => {
    stored.read_only = true;
    expect(messagesOf((await append('m1')).events)).toEqual(['m1']);
  });

  it('rejects a conversation that predates canonical event storage', async () => {
    stored.schema_version = undefined;
    await expect(append('m1')).rejects.toThrow('canonical event storage');
    expect(mockIndex).not.toHaveBeenCalled();
  });

  it('rejects cross-space writes', async () => {
    stored.space = 'other';
    await expect(append('m1')).rejects.toThrow();
    expect(mockIndex).not.toHaveBeenCalled();
  });

  it('preserves attachment versions referenced by previous messages', async () => {
    await append('m1', [{ id: 'a1', type: 'text', data: { text: 'one' } }]);
    const conversation = await append('m2', [{ id: 'a1', type: 'text', data: { text: 'two' } }]);
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
    await expect(append('m1')).rejects.toThrow();
    expect(mockIndex).not.toHaveBeenCalled();
    stored.access_control = { access_mode: ConversationAccessControlMode.Public, entries: [] };
    await append('m1');
    agentRegistry.get.mockRejectedValueOnce(createAgentNotFoundError({ agentId: 'agent' }));
    await expect(append('m2')).rejects.toThrow();
    expect(mockIndex).toHaveBeenCalledTimes(1);
  });
});
