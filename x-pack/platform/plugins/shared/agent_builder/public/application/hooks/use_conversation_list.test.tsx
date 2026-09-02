/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useConversationList } from './use_conversation_list';

const mockAddError = jest.fn();
const mockList = jest.fn();
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
    conversationsService: { list: mockList, search: mockSearch },
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
  Wrapper.displayName = 'UseConversationListTestWrapper';
  return Wrapper;
};

const emptyListPage = { pagination: { total: 0, page: 1, per_page: 50 }, results: [] };
const emptySearchPage = { pagination: { total: 0, page: 1, per_page: 25 }, results: [] };

describe('useConversationList', () => {
  beforeEach(() => {
    mockAddError.mockClear();
    mockList.mockReset();
    mockSearch.mockReset();

    // Default to empty pages so tests that don't care about list data don't hang.
    mockList.mockResolvedValue(emptyListPage);
    mockSearch.mockResolvedValue(emptySearchPage);
  });

  // -------------------------------------------------------------------------
  // list mode
  // -------------------------------------------------------------------------

  describe('list mode (no query)', () => {
    it('calls the list service and not the search service', async () => {
      mockList.mockResolvedValue({
        pagination: { total: 1, page: 1, per_page: 50 },
        results: [{ id: 'conv-1', title: 'Report' }],
      });

      const { result } = renderHook(() => useConversationList(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(mockList).toHaveBeenCalled();
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('returns isSearching: false', async () => {
      const { result } = renderHook(() => useConversationList(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.isSearching).toBe(false);
    });

    it('returns conversations from list results', async () => {
      mockList.mockResolvedValue({
        pagination: { total: 1, page: 1, per_page: 50 },
        results: [{ id: 'conv-1', title: 'Report' }],
      });

      const { result } = renderHook(() => useConversationList(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.conversations).toHaveLength(1));

      expect(result.current.conversations[0].id).toBe('conv-1');
    });
  });

  // -------------------------------------------------------------------------
  // search mode
  // -------------------------------------------------------------------------

  describe('search mode (with query)', () => {
    it('does not call the search service while the query is blank', () => {
      renderHook(() => useConversationList({ query: '' }), { wrapper: createWrapper() });

      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('sends the trimmed query, page, and perPage to the search service', async () => {
      mockSearch.mockResolvedValue({
        pagination: { total: 1, page: 1, per_page: 25 },
        results: [{ id: 'conv-1', title: 'Sales report' }],
      });

      renderHook(() => useConversationList({ query: '  sales  ', agentId: 'agent-1' }), {
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

    it('returns isSearching: true and search results when a query is active', async () => {
      mockSearch.mockResolvedValue({
        pagination: { total: 1, page: 1, per_page: 25 },
        results: [{ id: 'conv-1', title: 'Sales report' }],
      });

      const { result } = renderHook(() => useConversationList({ query: 'sales' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.conversations).toHaveLength(1));

      expect(result.current.isSearching).toBe(true);
      expect(result.current.conversations[0].id).toBe('conv-1');
    });

    it('dedupes conversations that appear on more than one page', async () => {
      mockSearch
        .mockResolvedValueOnce({
          pagination: { total: 2, page: 1, per_page: 1 },
          results: [{ id: 'conv-1', title: 'One' }],
        })
        .mockResolvedValueOnce({
          pagination: { total: 2, page: 2, per_page: 1 },
          // Same id reappearing on the next page, e.g. because its sort position
          // shifted between the two fetches.
          results: [{ id: 'conv-1', title: 'One' }],
        });

      const { result } = renderHook(() => useConversationList({ query: 'one' }), {
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
      // MAX_RESULT_WINDOW = 10_000, SEARCH_PAGE_SIZE = 25 → window caps at page 400.
      // total = 20_000 keeps `page * perPage < total` true, so only the window boundary
      // (not exhausted results) should stop paging here.
      mockSearch.mockResolvedValue({
        pagination: { total: 20_000, page: 400, per_page: 25 },
        results: [],
      });

      const { result } = renderHook(() => useConversationList({ query: 'anything' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.hasNextPage).toBeFalsy();
    });

    it('calls notifications.toasts.addError when the search request fails', async () => {
      const networkError = new Error('network');
      mockSearch.mockRejectedValue(networkError);

      renderHook(() => useConversationList({ query: 'anything' }), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledTimes(1);
      });

      const [errorArg, optionsArg] = mockAddError.mock.calls[0];
      expect(errorArg).toBe(networkError);
      expect(optionsArg).toEqual({ title: 'Unable to search conversations' });
    });
  });
});
