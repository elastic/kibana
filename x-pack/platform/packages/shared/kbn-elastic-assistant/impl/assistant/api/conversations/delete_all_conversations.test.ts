/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import {
  API_VERSIONS,
  ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL,
} from '@kbn/elastic-assistant-common';
import { deleteAllConversations } from './delete_all_conversations';
import { IToasts } from '@kbn/core/public';

const mockAddError = jest.fn();
const toasts = {
  addError: mockAddError,
} as unknown as IToasts;

describe('deleteAllConversations', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();

    jest.clearAllMocks();
  });

  it('should send a POST request with the correct parameters and receive a successful response', async () => {
    await deleteAllConversations({ http: httpMock, toasts });

    expect(httpMock.fetch).toHaveBeenCalledWith(ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL, {
      method: 'DELETE',
      version: API_VERSIONS.public.v1,
      body: JSON.stringify({
        excludedIds: [],
      }),
    });
  });

  it('should handle cases where result.failure exists', async () => {
    httpMock.fetch.mockResolvedValue({
      success: false,
      failures: [{ message: 'Error updating conversations for conversation Conversation 1' }],
    });

    await deleteAllConversations({ http: httpMock, toasts });
    expect(mockAddError.mock.calls[0][0]).toEqual(new Error('Failed to delete all conversations'));
  });

  it('should handle error', async () => {
    httpMock.fetch.mockRejectedValue(new Error('Error'));

    await deleteAllConversations({ http: httpMock, toasts });
    expect(mockAddError.mock.calls[0][0]).toEqual(new Error('Error'));
  });
});
