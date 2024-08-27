/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

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
const onFetch = jest.fn();

const defaultProps = {
  http,
  onFetch,
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
  it(`should make http request to fetch conversations`, async () => {
    renderHook(() => useFetchCurrentUserConversations(defaultProps), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      const { waitForNextUpdate } = renderHook(() =>
        useFetchCurrentUserConversations(defaultProps)
      );
      await waitForNextUpdate();
      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/current_user/conversations/_find',
        {
          method: 'GET',
          query: {
            page: 1,
            perPage: 100,
          },
          version: '2023-10-31',
          signal: undefined,
        }
      );

      expect(onFetch).toHaveBeenCalled();
    });
  });
});
