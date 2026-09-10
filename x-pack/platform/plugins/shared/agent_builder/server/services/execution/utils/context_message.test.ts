/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createConversationClientMock,
  createEmptyConversation,
} from '../../../test_utils/conversations';
import { persistContextMessage } from './conversations';

describe('persistContextMessage', () => {
  const client = createConversationClientMock();

  beforeEach(() => {
    jest.clearAllMocks();
    client.getByOrigin.mockResolvedValue(undefined);
    client.appendContextMessage.mockImplementation(async ({ id, messageId }) =>
      createEmptyConversation({ id, events: [{ id: messageId }] as never })
    );
  });

  it('assigns distinct public identities', async () => {
    const first = await persistContextMessage({
      agentId: 'agent-1',
      spaceId: 'default',
      conversationClient: client,
      message: 'hello',
      attachments: [],
      getTypeDefinition: jest.fn(),
    });

    const second = await persistContextMessage({
      agentId: 'agent-1',
      spaceId: 'default',
      conversationClient: client,
      message: 'hello',
      attachments: [],
      getTypeDefinition: jest.fn(),
    });

    expect(second.id).not.toBe(first.id);
    expect(second.events?.[0].id).not.toBe(first.events?.[0].id);
  });
});
