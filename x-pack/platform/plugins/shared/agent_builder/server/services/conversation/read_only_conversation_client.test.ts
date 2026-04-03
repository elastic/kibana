/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { ReadOnlyConversationClient, ConversationsStart } from '../../types';
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
    };
  },
});

describe('ReadOnlyConversationClient', () => {
  let conversationsStart: ConversationsStart;
  let internalClient: ConversationClientMock;
  let readOnlyClient: ReadOnlyConversationClient;
  const request = {} as KibanaRequest;

  beforeEach(async () => {
    internalClient = createConversationClientMock();
    const internalService: ConversationService = {
      getScopedClient: jest.fn().mockResolvedValue(internalClient),
    };
    conversationsStart = createConversationsStart(internalService);
    readOnlyClient = await conversationsStart.getScopedClient({ request });
  });

  it('delegates get() to the internal conversation client', async () => {
    const conversation = createEmptyConversation({ id: 'conv-1', title: 'Test' });
    internalClient.get.mockResolvedValue(conversation);

    const result = await readOnlyClient.get('conv-1');

    expect(internalClient.get).toHaveBeenCalledWith('conv-1');
    expect(result).toEqual(conversation);
  });

  it('delegates list() to the internal conversation client', async () => {
    const conversations = [
      { ...createEmptyConversation({ id: 'conv-1' }), rounds: undefined },
      { ...createEmptyConversation({ id: 'conv-2' }), rounds: undefined },
    ];
    internalClient.list.mockResolvedValue(conversations);

    const result = await readOnlyClient.list({ agentId: 'agent-1' });

    expect(internalClient.list).toHaveBeenCalledWith({ agentId: 'agent-1' });
    expect(result).toEqual(conversations);
  });

  it('does not expose create, update, delete, or exists methods', () => {
    const clientKeys = Object.keys(readOnlyClient);
    expect(clientKeys).toEqual(expect.arrayContaining(['get', 'list']));
    expect(clientKeys).not.toContain('create');
    expect(clientKeys).not.toContain('update');
    expect(clientKeys).not.toContain('delete');
    expect(clientKeys).not.toContain('exists');
  });
});
