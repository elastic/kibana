/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useConversationSearch } from './use_conversation_search';

const mockAddError = jest.fn();
const mockSearch = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    services: {
      notifications: {
        toasts: {
          addError: mockAddError,
        },
      },
    },
  }),
}));

jest.mock('./use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    conversationsService: { search: mockSearch },
  }),
}));

jest.mock('@kbn/react-hooks', () => ({
  useDebouncedValue: (value: string) => value,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseConversationSearchTestWrapper';
  return Wrapper;
};

describe('useConversationSearch', () => {
  beforeEach(() => {
    mockAddError.mockClear();
    mockSearch.mockReset();
  });

  it('does not request while the query is blank', () => {
    renderHook(() => useConversationSearch({ query: '' }), { wrapper: createWrapper() });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('sends the trimmed query, page, and perPage to the service', async () => {
    mockSearch.mockResolvedValue({
      pagination: { total: 1, page: 1, per_page: 25 },
      results: [{ id: 'conversation-1', title: 'Sales report' }],
    });

    renderHook(() => useConversationSearch({ query: '  sales  ', agentId: 'agent-1' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith({
        query: 'sales',
        agentId: 'agent-1',
        page: 1,
        perPage: 25,
      });
    });
  });

  it('dedupes conversations that appear on more than one page', async () => {
    mockSearch
      .mockResolvedValueOnce({
        pagination: { total: 2, page: 1, per_page: 1 },
        results: [{ id: 'conversation-1', title: 'One' }],
      })
      .mockResolvedValueOnce({
        pagination: { total: 2, page: 2, per_page: 1 },
        // Same id reappearing on the next page, e.g. because its sort position
        // shifted between the two fetches.
        results: [{ id: 'conversation-1', title: 'One' }],
      });

    const { result } = renderHook(() => useConversationSearch({ query: 'one' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2));
    expect(result.current.conversations).toHaveLength(1);
  });

  it('stops paging once the next page would exceed the ES result window', async () => {
    // MAX_RESULT_WINDOW = 10_000, perPage = 25 (hardcoded in the hook) → the window caps
    // out at page 400. total = 20_000 keeps `page * perPage < total` true, so only the
    // window boundary (not exhausted results) is what should stop paging here.
    mockSearch.mockResolvedValue({
      pagination: { total: 20_000, page: 400, per_page: 25 },
      results: [],
    });

    const { result } = renderHook(() => useConversationSearch({ query: 'anything' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasNextPage).toBeFalsy();
  });

  it('calls notifications.toasts.addError when the search request fails', async () => {
    const networkError = new Error('network');
    mockSearch.mockRejectedValue(networkError);

    renderHook(() => useConversationSearch({ query: 'anything' }), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledTimes(1);
    });

    const [errorArg, optionsArg] = mockAddError.mock.calls[0];
    expect(errorArg).toBe(networkError);
    expect(optionsArg).toEqual({ title: 'Unable to search conversations' });
  });
});
