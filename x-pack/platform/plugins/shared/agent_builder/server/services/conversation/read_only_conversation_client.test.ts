/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  createAgentNotFoundError,
  isConversationAlreadyExistsError,
  ConversationAccessControlMode,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { AgentRegistry } from '../agents/agent_registry';
import {
  createConversationClientMock,
  createEmptyConversation,
  type ConversationClientMock,
} from '../../test_utils/conversations';
import { createConversationPublicClient } from './conversation_public_client';

describe('createConversationPublicClient', () => {
  let internalClient: ConversationClientMock;
  let agentRegistry: jest.Mocked<Pick<AgentRegistry, 'get' | 'getIds'>>;
  let publicClient: ConversationPublicClient;

  beforeEach(() => {
    internalClient = createConversationClientMock();
    agentRegistry = {
      get: jest.fn().mockResolvedValue({ id: agentBuilderDefaultAgentId }),
      getIds: jest.fn().mockResolvedValue([agentBuilderDefaultAgentId]),
    };
    publicClient = createConversationPublicClient({
      client: internalClient,
      agentRegistry: agentRegistry as unknown as AgentRegistry,
      source: 'server_api',
    });
  });

  it('delegates get() to the internal conversation client', async () => {
    const conversation = createEmptyConversation({ id: 'conv-1', title: 'Test' });
    internalClient.get.mockResolvedValue(conversation);

    const result = await publicClient.get('conv-1');

    expect(internalClient.get).toHaveBeenCalledWith('conv-1');
    expect(result).toEqual(conversation);
  });

  it('delegates list() to the internal conversation client', async () => {
    const conversations = [
      createEmptyConversation({ id: 'conv-1' }),
      createEmptyConversation({ id: 'conv-2' }),
    ].map(({ rounds, ...withoutRounds }) => withoutRounds);
    const listResult = { results: conversations, total: conversations.length };
    internalClient.list.mockResolvedValue(listResult);

    const result = await publicClient.list({ agentId: 'agent-1' });

    expect(internalClient.list).toHaveBeenCalledWith({ agentId: 'agent-1' });
    expect(result).toEqual(listResult);
  });

  it('delegates search() to the internal conversation client', async () => {
    const conversations = [createEmptyConversation({ id: 'conv-1' })].map(
      ({ rounds, ...withoutRounds }) => withoutRounds
    );
    const searchResult = { results: conversations, total: conversations.length };
    internalClient.search.mockResolvedValue(searchResult);

    const options = {
      query: 'payment',
      filter: 'attachment_type: alert',
      sort: { field: 'created_at', order: 'desc' },
    } as const;
    const result = await publicClient.search(options);

    expect(internalClient.search).toHaveBeenCalledWith(options);
    expect(result).toEqual(searchResult);
  });

  it('delegates bulkGet() to the internal conversation client', async () => {
    const conversations = new Map(
      [createEmptyConversation({ id: 'conv-1' }), createEmptyConversation({ id: 'conv-2' })].map(
        ({ rounds, ...withoutRounds }) => [withoutRounds.id, withoutRounds]
      )
    );
    internalClient.bulkGet.mockResolvedValue(conversations);

    const result = await publicClient.bulkGet(['conv-1', 'conv-2']);

    expect(internalClient.bulkGet).toHaveBeenCalledWith(['conv-1', 'conv-2']);
    expect(result).toEqual(conversations);
  });

  it('delegates getByOrigin() to the internal conversation client', async () => {
    const conversation = createEmptyConversation({ id: 'conv-1' });
    internalClient.getByOrigin.mockResolvedValue(conversation);
    const origin = { external_conversation_id: 'team:T1/channel:C1/thread:1712345678.000100' };

    const result = await publicClient.getByOrigin(origin);

    expect(internalClient.getByOrigin).toHaveBeenCalledWith(origin);
    expect(result).toEqual(conversation);
  });

  describe('create()', () => {
    beforeEach(() => {
      internalClient.exists.mockResolvedValue(false);
      internalClient.create.mockResolvedValue(createEmptyConversation({ id: 'conv-1' }));
    });

    it('uses the default agent and title when not specified', async () => {
      await publicClient.create({});

      expect(internalClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_id: agentBuilderDefaultAgentId,
          title: DEFAULT_CONVERSATION_TITLE,
          rounds: [],
        }),
        { source: 'server_api' }
      );
    });

    it('passes agent_id, id, title, and access_control through to the internal client', async () => {
      await publicClient.create({
        agentId: 'custom-agent',
        id: 'conv-1',
        title: 'My chat',
        accessControl: { access_mode: ConversationAccessControlMode.Private },
      });

      expect(internalClient.create).toHaveBeenCalledWith(
        {
          agent_id: 'custom-agent',
          id: 'conv-1',
          title: 'My chat',
          access_control: { access_mode: ConversationAccessControlMode.Private, entries: [] },
          rounds: [],
        },
        { source: 'server_api' }
      );
    });

    it('passes origin through to the internal client', async () => {
      const origin = { external_conversation_id: 'team:T1/channel:C1/thread:1712345678.000100' };

      await publicClient.create({ id: 'conv-1', origin });

      expect(internalClient.create).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'conv-1', origin }),
        { source: 'server_api' }
      );
    });

    it('validates agent access before writing', async () => {
      agentRegistry.get.mockRejectedValue(createAgentNotFoundError({ agentId: 'bad-agent' }));

      await expect(publicClient.create({ agentId: 'bad-agent' })).rejects.toThrow();
      expect(internalClient.create).not.toHaveBeenCalled();
    });

    it('throws conversationAlreadyExists when the supplied id is already taken', async () => {
      internalClient.exists.mockResolvedValue(true);

      const err = await publicClient.create({ id: 'dup-id' }).catch((e: unknown) => e);

      expect(isConversationAlreadyExistsError(err)).toBe(true);
      expect(internalClient.create).not.toHaveBeenCalled();
    });

    it('skips the exists check when no id is provided', async () => {
      await publicClient.create({});

      expect(internalClient.exists).not.toHaveBeenCalled();
    });
  });

  it('binds its source on every write', async () => {
    internalClient.addCustomEvents.mockResolvedValue([]);
    internalClient.patchMetadata.mockResolvedValue({
      conversation: createEmptyConversation({ id: 'conv-1' }),
      changedFields: ['status'],
    });
    internalClient.update.mockResolvedValue(createEmptyConversation({ id: 'conv-1' }));
    const workflowClient = createConversationPublicClient({
      client: internalClient,
      agentRegistry: agentRegistry as unknown as AgentRegistry,
      source: 'workflow',
    });

    await workflowClient.addEvents({ conversationId: 'conv-1', events: [] });
    await workflowClient.patchMetadata('conv-1', { status: 'open' });
    await workflowClient.update({ id: 'conv-1', title: 'Renamed' });

    expect(internalClient.addCustomEvents).toHaveBeenCalledWith(
      { id: 'conv-1', events: [] },
      { source: 'workflow' }
    );
    expect(internalClient.patchMetadata).toHaveBeenCalledWith(
      'conv-1',
      { status: 'open' },
      { access: 'owner', source: 'workflow' }
    );
    expect(internalClient.update).toHaveBeenCalledWith(
      { id: 'conv-1', title: 'Renamed' },
      { access: 'owner', retryOnConflict: true, source: 'workflow' }
    );
  });

  it('does not expose delete, upsertRound, or exists methods', () => {
    const clientKeys = Object.keys(publicClient);
    expect(clientKeys).toEqual(
      expect.arrayContaining([
        'get',
        'bulkGet',
        'getByOrigin',
        'list',
        'search',
        'create',
        'addAccessControlEntries',
        'removeAccessControlEntries',
        'patchMetadata',
        'update',
      ])
    );
    expect(clientKeys).not.toContain('delete');
    expect(clientKeys).not.toContain('upsertRound');
    expect(clientKeys).not.toContain('exists');
  });
});
