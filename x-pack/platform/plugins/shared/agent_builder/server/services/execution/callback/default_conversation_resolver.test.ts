/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import {
  createConversationClientMock,
  createEmptyConversation,
} from '../../../test_utils/conversations';
import { createDefaultConversationResolver } from './default_conversation_resolver';

describe('createDefaultConversationResolver', () => {
  const request = httpServerMock.createKibanaRequest();
  const origin = { type: ConversationOriginType.Slack, external_conversation_id: 'thread-1' };

  const setup = () => {
    const client = createConversationClientMock();
    const getScopedClient = jest.fn().mockResolvedValue(client);
    const resolve = createDefaultConversationResolver({
      conversations: { getScopedClient, getScopedClientAsUser: jest.fn() },
    });
    return { client, getScopedClient, resolve };
  };

  it('returns the conversation that has the origin, read as the caller', async () => {
    const { client, getScopedClient, resolve } = setup();
    client.getByOrigin.mockResolvedValue(createEmptyConversation({ id: 'conversation-1' }));

    await expect(resolve({ origin, spaceId: 'default', request })).resolves.toEqual({
      conversationId: 'conversation-1',
    });
    expect(getScopedClient).toHaveBeenCalledWith({ request });
    expect(client.getByOrigin).toHaveBeenCalledWith({ external_conversation_id: 'thread-1' });
  });

  it('returns undefined when no conversation has the origin', async () => {
    const { client, resolve } = setup();
    client.getByOrigin.mockResolvedValue(undefined);

    await expect(resolve({ origin, spaceId: 'default', request })).resolves.toBeUndefined();
  });
});
