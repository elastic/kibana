/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import type { ConversationPublicClient, ConversationsStart } from '../../types';
import {
  createConversationClientMock,
  createEmptyConversation,
  type ConversationClientMock,
} from '../../test_utils/conversations';
import type { ConversationService } from './conversation_service';

/**
 * Builds a `ConversationsStart` that wraps the internal ConversationService
 * the same way `plugin.ts` does, so we can verify the wrapping logic in
 * isolation without booting the full plugin.
 */
const createConversationsStart = (internalService: ConversationService): ConversationsStart => ({
  getScopedClient: async ({ request }) => {
    const client = await internalService.getScopedClient({ request });
    return {
      get: client.get.bind(client),
      list: client.list.bind(client),
      create: ({ agentId, id, title, accessControl }) =>
        client.create({
          agent_id: agentId ?? agentBuilderDefaultAgentId,
          id,
          title: title ?? 'New conversation',
          access_control: accessControl,
          rounds: [],
        }),
    };
  },
});

describe('ConversationPublicClient', () => {
  let conversationsStart: ConversationsStart;
  let internalClient: ConversationClientMock;
  let publicClient: ConversationPublicClient;
  const request = {} as KibanaRequest;

  beforeEach(async () => {
    internalClient = createConversationClientMock();
    const internalService: ConversationService = {
      getScopedClient: jest.fn().mockResolvedValue(internalClient),
      getConversationRoundAuthor: jest.fn().mockResolvedValue(undefined),
    };
    conversationsStart = createConversationsStart(internalService);
    publicClient = await conversationsStart.getScopedClient({ request });
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
    internalClient.list.mockResolvedValue(conversations);

    const result = await publicClient.list({ agentId: 'agent-1' });

    expect(internalClient.list).toHaveBeenCalledWith({ agentId: 'agent-1' });
    expect(result).toEqual(conversations);
  });

  it('delegates create() to the internal conversation client with defaults', async () => {
    const conversation = createEmptyConversation({ id: 'conv-1' });
    internalClient.create.mockResolvedValue(conversation);

    const result = await publicClient.create({ agentId: 'agent-1', id: 'conv-1' });

    expect(internalClient.create).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      id: 'conv-1',
      title: 'New conversation',
      access_control: undefined,
      rounds: [],
    });
    expect(result).toEqual(conversation);
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
