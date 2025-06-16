/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

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
const defaultProps = {
  http,
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

    await waitFor(() => {
      expect(defaultProps.http.fetch).toHaveBeenCalledWith(
        '/api/security_ai_assistant/current_user/conversations/_find',
        {
          method: 'GET',
          query: {
            page: 1,
            fields: ['id', 'title', 'apiConfig', 'updatedAt'],
            filter: undefined,
            per_page: 28,
            sort_field: 'updated_at',
            sort_order: 'desc',
          },
          version: '2023-10-31',
          signal: undefined,
        }
      );
    });
  });
});
