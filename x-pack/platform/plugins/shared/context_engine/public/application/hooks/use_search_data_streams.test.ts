/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { SearchDataStreamsResponse } from '../../../common/http_api/data_streams';
import { searchDataStreams } from '../api/data_streams';
import { useSearchDataStreams } from './use_search_data_streams';

jest.mock('../api/data_streams');

const mockedSearchDataStreams = jest.mocked(searchDataStreams);

interface UseSearchDataStreamsArgs {
  search: string;
  enabled: boolean;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: Error) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderSearchDataStreams = (core: CoreStart, initialProps: UseSearchDataStreamsArgs) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services: core },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

  return renderHook((props: UseSearchDataStreamsArgs) => useSearchDataStreams(props), {
    wrapper,
    initialProps,
  });
};

describe('useSearchDataStreams', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not call searchDataStreams when enabled is false', () => {
    const core = coreMock.createStart();

    renderSearchDataStreams(core, { search: 'lo', enabled: false });

    expect(mockedSearchDataStreams).not.toHaveBeenCalled();
  });

  it('calls searchDataStreams with the search and an AbortSignal when enabled', async () => {
    const core = coreMock.createStart();
    mockedSearchDataStreams.mockResolvedValue({
      dataStreams: ['logs-genai-default'],
      hasMore: true,
    });

    const { result } = renderSearchDataStreams(core, { search: 'lo', enabled: true });

    await waitFor(() => {
      expect(result.current.dataStreams).toEqual(['logs-genai-default']);
    });

    expect(mockedSearchDataStreams).toHaveBeenCalledWith(core.http, {
      search: 'lo',
      signal: expect.any(AbortSignal),
    });
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('aborts the previous in-flight request when search changes', async () => {
    const core = coreMock.createStart();
    const first = createDeferred<SearchDataStreamsResponse>();
    const second = createDeferred<SearchDataStreamsResponse>();
    let callCount = 0;
    mockedSearchDataStreams.mockImplementation(() => {
      callCount += 1;
      return callCount === 1 ? first.promise : second.promise;
    });

    const { rerender } = renderSearchDataStreams(core, { search: 'aa', enabled: true });

    await waitFor(() => expect(mockedSearchDataStreams).toHaveBeenCalledTimes(1));
    const firstSignal = mockedSearchDataStreams.mock.calls[0]?.[1]?.signal;
    expect(firstSignal).toBeInstanceOf(AbortSignal);
    expect(firstSignal?.aborted).toBe(false);

    rerender({ search: 'bb', enabled: true });

    await waitFor(() => expect(mockedSearchDataStreams).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);

    second.resolve({ dataStreams: ['logs-newer'], hasMore: false });
    first.reject(new Error('aborted'));
  });

  it('surfaces a rejected search as isError', async () => {
    const core = coreMock.createStart();
    mockedSearchDataStreams.mockRejectedValue(new Error('cluster exploded'));

    const { result } = renderSearchDataStreams(core, { search: 'lo', enabled: true });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.dataStreams).toEqual([]);
  });

  it('keeps previous dataStreams and reports isLoading while a later search is in flight', async () => {
    const core = coreMock.createStart();
    const second = createDeferred<SearchDataStreamsResponse>();
    mockedSearchDataStreams.mockResolvedValueOnce({
      dataStreams: ['logs-first'],
      hasMore: false,
    });
    mockedSearchDataStreams.mockReturnValueOnce(second.promise);

    const { result, rerender } = renderSearchDataStreams(core, {
      search: 'first',
      enabled: true,
    });

    await waitFor(() => {
      expect(result.current.dataStreams).toEqual(['logs-first']);
      expect(result.current.isLoading).toBe(false);
    });

    rerender({ search: 'second', enabled: true });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.dataStreams).toEqual(['logs-first']);

    second.resolve({ dataStreams: ['logs-second'], hasMore: true });

    await waitFor(() => {
      expect(result.current.dataStreams).toEqual(['logs-second']);
      expect(result.current.hasMore).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
