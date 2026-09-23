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
        })
      );
    });

    it('passes agent_id, id, title, and access_control through to the internal client', async () => {
      await publicClient.create({
        agentId: 'custom-agent',
        id: 'conv-1',
        title: 'My chat',
        accessControl: { access_mode: ConversationAccessControlMode.Private },
      });

      expect(internalClient.create).toHaveBeenCalledWith({
        agent_id: 'custom-agent',
        id: 'conv-1',
        title: 'My chat',
        access_control: { access_mode: ConversationAccessControlMode.Private, entries: [] },
        rounds: [],
      });
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

  it('does not expose update, delete, upsertRound, or exists methods', () => {
    const clientKeys = Object.keys(publicClient);
    expect(clientKeys).toEqual(expect.arrayContaining(['get', 'list', 'create']));
    expect(clientKeys).not.toContain('update');
    expect(clientKeys).not.toContain('delete');
    expect(clientKeys).not.toContain('upsertRound');
    expect(clientKeys).not.toContain('exists');
  });
});
