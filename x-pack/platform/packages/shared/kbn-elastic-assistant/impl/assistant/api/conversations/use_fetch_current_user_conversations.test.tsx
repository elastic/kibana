/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ReactNode } from 'react';
import React from 'react';
import type { UseFetchCurrentUserConversationsParams } from './use_fetch_current_user_conversations';
import { useFetchCurrentUserConversations } from './use_fetch_current_user_conversations';
import { welcomeConvo } from '../../../mock/conversation';

const http = {
  fetch: jest.fn().mockResolvedValue({ page: 1, perPage: 28, total: 0, data: [welcomeConvo] }),
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
            is_owner: false,
          },
          version: '2023-10-31',
          signal: undefined,
        }
      );
    });
  });
  it(`should enhance the response with isConversationOwner=true when no currentUser`, async () => {
    const { result } = renderHook(() => useFetchCurrentUserConversations(defaultProps), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({
        [welcomeConvo.id]: {
          ...welcomeConvo,
          isConversationOwner: true,
        },
      });
    });
  });
  it(`should enhance the response with isConversationOwner=true when current user is conversation user`, async () => {
    const { result } = renderHook(
      () =>
        useFetchCurrentUserConversations({ ...defaultProps, currentUser: welcomeConvo.createdBy }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({
        [welcomeConvo.id]: {
          ...welcomeConvo,
          isConversationOwner: true,
        },
      });
    });
  });
  it(`should enhance the response with isConversationOwner=false when current user is not conversation user`, async () => {
    const { result } = renderHook(
      () => useFetchCurrentUserConversations({ ...defaultProps, currentUser: { name: 'nobody' } }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({
        [welcomeConvo.id]: {
          ...welcomeConvo,
          isConversationOwner: false,
        },
      });
    });
  });
});
