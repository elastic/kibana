/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import {
  DeleteConversationParams,
  GetConversationByIdParams,
  deleteConversation,
  getConversationById,
} from './conversations';
import { HttpSetupMock } from '@kbn/core-http-browser-mocks';
import { coreMock } from '@kbn/core/public/mocks';

let http: HttpSetupMock = coreMock.createSetup().http;

const toasts = {
  addError: jest.fn(),
};

describe('conversations api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    http = coreMock.createSetup().http;
  });

  it('should call api to delete conversation', async () => {
    await act(async () => {
      const deleteProps = { http, toasts, id: 'test' } as unknown as DeleteConversationParams;

      const { waitForNextUpdate } = renderHook(() => deleteConversation(deleteProps));
      await waitForNextUpdate();

      expect(deleteProps.http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/current_user/conversations/test',
        {
          method: 'DELETE',
          signal: undefined,
          version: '2023-10-31',
        }
      );
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });

  it('should display error toast when delete api throws error', async () => {
    http.fetch.mockRejectedValue(new Error('this is an error'));
    const deleteProps = { http, toasts, id: 'test' } as unknown as DeleteConversationParams;

    await expect(deleteConversation(deleteProps)).rejects.toThrowError('this is an error');
    expect(toasts.addError).toHaveBeenCalled();
  });

  it('should call api to get conversation', async () => {
    await act(async () => {
      const getProps = { http, toasts, id: 'test' } as unknown as GetConversationByIdParams;
      const { waitForNextUpdate } = renderHook(() => getConversationById(getProps));
      await waitForNextUpdate();

      expect(getProps.http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/current_user/conversations/test',
        {
          method: 'GET',
          signal: undefined,
          version: '2023-10-31',
        }
      );
      expect(toasts.addError).not.toHaveBeenCalled();
    });
  });

  it('should display error toast when get api throws error', async () => {
    http.fetch.mockRejectedValue(new Error('this is an error'));
    const getProps = { http, toasts, id: 'test' } as unknown as GetConversationByIdParams;

    await expect(getConversationById(getProps)).rejects.toThrowError('this is an error');
    expect(toasts.addError).toHaveBeenCalled();
  });
});
