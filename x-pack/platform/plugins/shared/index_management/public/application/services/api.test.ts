/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { createElement } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { ES_SEARCH_STRATEGY, ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { DEFAULT_DOCUMENT_PAGE_SIZE } from '../../../common/constants';
import { fetchIndexDocCounts, useLoadIndexDocumentsSample } from './api';
import { createSearchMock } from './search.mock';

const setupSearch = () => {
  const http = httpServiceMock.createSetupContract();
  return { post: http.post, search: createSearchMock(http) };
};

const docCountResponse = (values: Array<[string, number]>) => ({
  rawResponse: {
    columns: [
      { name: '_index', type: 'keyword' },
      { name: 'count()', type: 'long' },
    ],
    values,
  },
});

describe('WHEN fetching document counts', () => {
  it('SHOULD send one ES|QL query for all indices with the ES|QL search strategy', async () => {
    const { post, search } = setupSearch();
    post.mockResolvedValue(docCountResponse([]));
    const { signal } = new AbortController();

    await fetchIndexDocCounts(search, ['logs', 'my "quoted" index'], signal);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(`/internal/search/${ESQL_SEARCH_STRATEGY}`, {
      body: JSON.stringify({
        params: {
          query: 'FROM "logs","my \\"quoted\\" index" METADATA _index | STATS count() BY _index',
          allow_partial_results: true,
        },
      }),
      signal,
    });
  });

  it('SHOULD map counts by column name and count indices without documents as 0', async () => {
    const { post, search } = setupSearch();
    post.mockResolvedValue(docCountResponse([['logs', 3]]));

    expect(await fetchIndexDocCounts(search, ['logs', 'empty'])).toEqual({ logs: 3, empty: 0 });
  });

  it('SHOULD reject WHEN the search fails', async () => {
    const { post, search } = setupSearch();
    post.mockRejectedValue(new Error('search failed'));

    await expect(fetchIndexDocCounts(search, ['logs'])).rejects.toThrow('search failed');
  });
});

describe('WHEN loading a sample of index documents', () => {
  it('SHOULD search the index with the Elasticsearch search strategy', async () => {
    const { post, search } = setupSearch();
    const hits = [{ _index: 'logs', _id: '1' }];
    post.mockResolvedValue({ rawResponse: { hits: { hits } } });
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useLoadIndexDocumentsSample(search, 'logs'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual({ results: hits }));
    expect(post).toHaveBeenCalledWith(`/internal/search/${ES_SEARCH_STRATEGY}`, {
      body: JSON.stringify({
        params: {
          index: 'logs',
          size: DEFAULT_DOCUMENT_PAGE_SIZE,
          track_total_hits: false,
          _source: { includes: ['*', '_inference_fields'] },
          fields: ['*'],
          sort: [{ _doc: { order: 'desc' } }],
        },
      }),
      signal: expect.any(AbortSignal),
    });
  });

  it('SHOULD expose the search error WHEN the search fails', async () => {
    const { post, search } = setupSearch();
    post.mockRejectedValue(new Error('search failed'));
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useLoadIndexDocumentsSample(search, 'logs'), { wrapper });

    await waitFor(() => expect(result.current.error?.message).toBe('search failed'));
    expect(post).toHaveBeenCalledTimes(1);
  });
});
