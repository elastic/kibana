/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkChangeConversations } from './use_bulk_actions_conversations';
import {
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
  ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
} from '@kbn/elastic-assistant-common';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { IToasts } from '@kbn/core-notifications-browser';

const conversation1 = {
  id: 'conversation1',
  title: 'Conversation 1',
  apiConfig: { connectorId: '123' },
  replacements: [],
  category: 'default',
  messages: [
    {
      id: 'message1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: '2024-02-14T19:58:30.299Z',
    },
    {
      id: 'message2',
      role: 'user' as const,
      content: 'How are you?',
      timestamp: '2024-02-14T19:58:30.299Z',
    },
  ],
};
const conversation2 = {
  ...conversation1,
  id: 'conversation2',
  title: 'Conversation 2',
};
const toasts = {
  addError: jest.fn(),
};
describe('bulkChangeConversations', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();

    jest.clearAllMocks();
  });
  it('should send a POST request with the correct parameters and receive a successful response', async () => {
    const conversationsActions = {
      create: {},
      update: {},
      delete: { ids: [] },
    };

    await bulkChangeConversations(httpMock, conversationsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(
      ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        body: JSON.stringify({
          update: [],
          create: [],
          delete: { ids: [] },
        }),
      }
    );
  });

  it('should transform the conversations dictionary to an array of conversations to create', async () => {
    const conversationsActions = {
      create: {
        conversation1,
        conversation2,
      },
      update: {},
      delete: { ids: [] },
    };

    await bulkChangeConversations(httpMock, conversationsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(
      ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        body: JSON.stringify({
          update: [],
          create: [conversation1, conversation2],
          delete: { ids: [] },
        }),
      }
    );
  });

  it('should transform the conversations dictionary to an array of conversations to update', async () => {
    const conversationsActions = {
      update: {
        conversation1,
        conversation2,
      },
      delete: { ids: [] },
    };

    await bulkChangeConversations(httpMock, conversationsActions);

    expect(httpMock.fetch).toHaveBeenCalledWith(
      ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION,
        body: JSON.stringify({
          update: [conversation1, conversation2],
          delete: { ids: [] },
        }),
      }
    );
  });

  it('should throw an error with the correct message when receiving an unsuccessful response', async () => {
    httpMock.fetch.mockResolvedValue({
      success: false,
      attributes: {
        errors: [
          {
            statusCode: 400,
            message: 'Error updating conversations',
            conversations: [{ id: conversation1.id, name: conversation1.title }],
          },
        ],
      },
    });
    const conversationsActions = {
      create: {},
      update: {},
      delete: { ids: [] },
    };
    await bulkChangeConversations(httpMock, conversationsActions, toasts as unknown as IToasts);
    expect(toasts.addError.mock.calls[0][0]).toEqual(
      new Error('Error message: Error updating conversations for conversation Conversation 1')
    );
  });

  it('should handle cases where result.attributes.errors is undefined', async () => {
    httpMock.fetch.mockResolvedValue({
      success: false,
      attributes: {},
    });
    const conversationsActions = {
      create: {},
      update: {},
      delete: { ids: [] },
    };

    await bulkChangeConversations(httpMock, conversationsActions, toasts as unknown as IToasts);
    expect(toasts.addError.mock.calls[0][0]).toEqual(new Error(''));
  });
});
