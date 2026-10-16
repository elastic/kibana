/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexKind, MatchedItem } from '@kbn/data-views-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MAX_INDEX_SEARCH_RESULTS, useIndices } from './use_indices';

const buildMatchedItem = (name: string, kind: IndexKind = 'index'): MatchedItem => ({
  name,
  tags: [{ key: kind, name: kind, color: 'default' }],
  item: { name },
});

const renderUseIndices = (
  options: Parameters<typeof useIndices>[0],
  getIndices: jest.Mock<Promise<MatchedItem[]>>
) => {
  const core = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  data.dataViews.getIndices = getIndices;

  const services = {
    ...core,
    data,
  };

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

  return renderHook(() => useIndices(options), { wrapper });
};

describe('useIndices', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('requests indices with the default pattern when search is empty', async () => {
    const getIndices = jest
      .fn()
      .mockResolvedValue([buildMatchedItem('logs-*'), buildMatchedItem('metrics-*')]);
    renderUseIndices({ search: '' }, getIndices);

    await waitFor(() =>
      expect(getIndices).toHaveBeenCalledWith({
        pattern: '*,-.*',
        isRollupIndex: expect.any(Function),
      })
    );
  });

  it('uses the search text in the indices pattern', async () => {
    const getIndices = jest.fn().mockResolvedValue([buildMatchedItem('logs-*')]);
    renderUseIndices({ search: 'log' }, getIndices);

    await waitFor(() =>
      expect(getIndices).toHaveBeenCalledWith({
        pattern: '*log*',
        isRollupIndex: expect.any(Function),
      })
    );
  });

  it('uses substring matching for explicit searches including dot-prefixed names', async () => {
    const getIndices = jest.fn().mockResolvedValue([buildMatchedItem('.ds-logs-default')]);
    renderUseIndices({ search: '.ds-logs' }, getIndices);

    await waitFor(() =>
      expect(getIndices).toHaveBeenCalledWith({
        pattern: '*.ds-logs*',
        isRollupIndex: expect.any(Function),
      })
    );
  });

  it('returns index names from the data views service', async () => {
    const getIndices = jest
      .fn()
      .mockResolvedValue([buildMatchedItem('logs-*'), buildMatchedItem('.ds-metrics-default')]);
    const { result } = renderUseIndices({ search: '' }, getIndices);

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.indexNames).toEqual(['logs-*', '.ds-metrics-default']);
  });

  it('does not fetch indices when enabled is false', () => {
    const getIndices = jest.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderUseIndices({ search: '', enabled: false }, getIndices);

    expect(getIndices).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
    expect(result.current.indexNames).toEqual([]);
  });

  it('returns all resource kinds when types is omitted', async () => {
    const getIndices = jest
      .fn()
      .mockResolvedValue([
        buildMatchedItem('logs-index', 'index'),
        buildMatchedItem('logs-alias', 'alias'),
        buildMatchedItem('logs-ds', 'data_stream'),
      ]);
    const { result } = renderUseIndices({ search: '' }, getIndices);

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.indexNames).toEqual(['logs-index', 'logs-alias', 'logs-ds']);
  });

  it('caps results after type filtering', async () => {
    const getIndices = jest
      .fn()
      .mockResolvedValue(
        Array.from({ length: MAX_INDEX_SEARCH_RESULTS + 3 }, (_, index) =>
          buildMatchedItem(`logs-${index}`)
        )
      );
    const { result } = renderUseIndices({ search: '' }, getIndices);

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.indexNames).toHaveLength(MAX_INDEX_SEARCH_RESULTS);
    expect(result.current.indexNames[0]).toBe('logs-0');
    expect(result.current.indexNames[MAX_INDEX_SEARCH_RESULTS - 1]).toBe(
      `logs-${MAX_INDEX_SEARCH_RESULTS - 1}`
    );
  });

  it('filters results down to the given types', async () => {
    const getIndices = jest
      .fn()
      .mockResolvedValue([
        buildMatchedItem('logs-index', 'index'),
        buildMatchedItem('logs-alias', 'alias'),
        buildMatchedItem('logs-ds', 'data_stream'),
      ]);
    const { result } = renderUseIndices({ search: '', types: ['data_stream'] }, getIndices);

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.indexNames).toEqual(['logs-ds']);
  });

  it('does not lose results when returning to a search that is still in flight', async () => {
    let resolveA!: (value: MatchedItem[]) => void;
    const pendingA = new Promise<MatchedItem[]>((resolve) => {
      resolveA = resolve;
    });

    const getIndices = jest.fn(({ pattern }: { pattern: string }) => {
      if (pattern === '*a*') {
        return pendingA;
      }
      return Promise.resolve([buildMatchedItem('b-match')]);
    });

    const core = coreMock.createStart();
    const data = dataPluginMock.createStartContract();
    data.dataViews.getIndices = getIndices;
    const services = { ...core, data };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        KibanaContextProvider,
        { services },
        React.createElement(QueryClientProvider, { client: queryClient }, children)
      );

    const searchRef = { current: 'a' };
    const { result, rerender } = renderHook(() => useIndices({ search: searchRef.current }), {
      wrapper,
    });
    await waitFor(() => expect(getIndices).toHaveBeenCalledTimes(1));

    // Switch away, then back to "a" while its request is still pending.
    searchRef.current = 'b';
    rerender();
    await waitFor(() => expect(result.current.indexNames).toEqual(['b-match']));

    searchRef.current = 'a';
    rerender();

    // The original in-flight "a" fetch finally resolves; it must still populate "a"'s result.
    resolveA([buildMatchedItem('a-match')]);
    await waitFor(() => expect(result.current.indexNames).toEqual(['a-match']));
  });
});
