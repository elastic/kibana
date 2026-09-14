/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatchedItem } from '@kbn/data-views-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useIndices } from './use_indices';

const buildMatchedItem = (name: string): MatchedItem => ({
  name,
  tags: [],
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

  it('uses the debounced search text in the indices pattern', async () => {
    const getIndices = jest.fn().mockResolvedValue([buildMatchedItem('logs-*')]);
    renderUseIndices({ search: 'log' }, getIndices);

    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    await waitFor(() =>
      expect(getIndices).toHaveBeenCalledWith({
        pattern: 'log*,-.*',
        isRollupIndex: expect.any(Function),
      })
    );
  });

  it('returns index names from the data views service', async () => {
    const getIndices = jest
      .fn()
      .mockResolvedValue([buildMatchedItem('logs-*'), buildMatchedItem('.ds-metrics-default')]);
    const { result } = renderUseIndices({ search: '' }, getIndices);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.indexNames).toEqual(['logs-*', '.ds-metrics-default']);
    expect(result.current.isError).toBe(false);
  });

  it('returns isError when the indices request rejects', async () => {
    const getIndices = jest.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderUseIndices({ search: '' }, getIndices);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.indexNames).toEqual([]);
  });

  it('does not fetch indices when enabled is false', () => {
    const getIndices = jest.fn().mockReturnValue(new Promise(() => {}));
    const { result } = renderUseIndices({ search: '', enabled: false }, getIndices);

    expect(getIndices).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.indexNames).toEqual([]);
  });
});
