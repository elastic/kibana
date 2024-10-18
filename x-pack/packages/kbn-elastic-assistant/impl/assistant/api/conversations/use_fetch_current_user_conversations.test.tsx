/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';
import {
  UseFetchCurrentUserConversationsParams,
  useFetchCurrentUserConversations,
} from './use_fetch_current_user_conversations';
import { defaultAssistantFeatures } from '@kbn/elastic-assistant-common';

const http = {
  fetch: jest.fn().mockResolvedValue(defaultAssistantFeatures),
};
const mockData = {
  welcome_id: {
    id: 'welcome_id',
    title: 'Welcome',
    category: 'assistant',
    messages: [],
    apiConfig: { connectorId: '123' },
    replacements: {},
  },
  electric_sheep_id: {
    id: 'electric_sheep_id',
    category: 'assistant',
    title: 'electric sheep',
    messages: [],
    apiConfig: { connectorId: '123' },
    replacements: {},
  },
};

const defaultProps = {
  http,
  baseConversations: {},
  isAssistantEnabled: true,
} as unknown as UseFetchCurrentUserConversationsParams;

const createWrapper = () => {
  const queryClient = new QueryClient();
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFetchCurrentUserConversations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it(`should make http request to fetch conversations`, async () => {
    renderHook(() => useFetchCurrentUserConversations(defaultProps), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useFetchCurrentUserConversations(defaultProps),
        {
          wrapper: createWrapper(),
        }
      );
      await waitForNextUpdate();
      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/current_user/conversations/_find',
        {
          method: 'GET',
          query: {
            page: 1,
            per_page: 5000,
            fields: ['title', 'is_default', 'updated_at', 'api_config'],
            sort_field: 'is_default',
            sort_order: 'desc',
          },
          version: '2023-10-31',
          signal: undefined,
        }
      );
      expect(result.current.data).toEqual({});
    });
  });
  it(`Combines baseConversations with result`, async () => {
    renderHook(() => useFetchCurrentUserConversations(defaultProps), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook(
        () => useFetchCurrentUserConversations({ ...defaultProps, baseConversations: mockData }),
        {
          wrapper: createWrapper(),
        }
      );
      await waitForNextUpdate();
      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/current_user/conversations/_find',
        {
          method: 'GET',
          query: {
            page: 1,
            per_page: 5000,
            fields: ['title', 'is_default', 'updated_at', 'api_config'],
            sort_field: 'is_default',
            sort_order: 'desc',
          },
          version: '2023-10-31',
          signal: undefined,
        }
      );
      expect(result.current.data).toEqual(mockData);
    });
  });
});
