/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { UnparsedEsqlResponse } from '@kbn/traced-es-client';
import { useStreamDocCountsFetch } from './use_streams_doc_counts_fetch';
import { executeEsqlQuery } from './use_execute_esql_query';

jest.mock('./use_execute_esql_query', () => ({ executeEsqlQuery: jest.fn() }));

const mockTimeState$ = new Subject<{ kind: string }>();
jest.mock('./use_timefilter', () => ({
  useTimefilter: () => ({ timeState: { start: 0, end: 3_600_000 }, timeState$: mockTimeState$ }),
}));

jest.mock('./use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        data: { search: { search: jest.fn() } },
        streams: { streamsRepositoryClient: { fetch: jest.fn() } },
      },
    },
    core: { uiSettings: { get: jest.fn().mockReturnValue('UTC') } },
  }),
}));

const mockExecuteEsqlQuery = executeEsqlQuery as jest.MockedFunction<typeof executeEsqlQuery>;

interface PendingQuery {
  signal: AbortSignal;
  resolve: (response: UnparsedEsqlResponse) => void;
}

let pendingQueries: PendingQuery[];

// Aborted histograms reject, so every promise a test creates gets a handler.
const getHistogram = (
  hook: { current: ReturnType<typeof useStreamDocCountsFetch> },
  streamName: string
) => {
  const fetch = hook.current.getStreamHistogram(streamName);
  fetch.catch(() => {});
  return fetch;
};

const renderFetchHook = () =>
  renderHook(() =>
    useStreamDocCountsFetch({
      groupTotalCountByTimestamp: true,
      getCanReadFailureStore: () => false,
      numDataPoints: 25,
      fetchIngestionDocCounts: false,
    })
  );

describe('useStreamDocCountsFetch histograms', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    pendingQueries = [];
    mockExecuteEsqlQuery.mockReset();
    mockExecuteEsqlQuery.mockImplementation(
      ({ signal }) =>
        new Promise((resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
          pendingQueries.push({ signal: signal as AbortSignal, resolve: resolve as never });
        })
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reuses one request per stream while it is cached', () => {
    const { result } = renderFetchHook();

    const first = getHistogram(result, 'logs-a');
    const second = getHistogram(result, 'logs-a');

    expect(second).toBe(first);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
  });

  it('gives every stream its own abort signal', () => {
    const { result } = renderFetchHook();

    getHistogram(result, 'logs-a');
    getHistogram(result, 'logs-b');

    expect(pendingQueries).toHaveLength(2);
    expect(pendingQueries[0].signal).not.toBe(pendingQueries[1].signal);
  });

  it('aborts and evicts a pending histogram once its last row releases it', () => {
    const { result } = renderFetchHook();
    const fetch = getHistogram(result, 'logs-a');
    const releaseFirst = result.current.retainStreamHistogram(fetch);
    const releaseSecond = result.current.retainStreamHistogram(fetch);

    releaseFirst();
    act(() => jest.runOnlyPendingTimers());
    expect(pendingQueries[0].signal.aborted).toBe(false);

    releaseSecond();
    act(() => jest.runOnlyPendingTimers());
    expect(pendingQueries[0].signal.aborted).toBe(true);

    expect(getHistogram(result, 'logs-a')).not.toBe(fetch);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(2);
  });

  it('keeps a histogram that is retained again before the release runs', () => {
    const { result } = renderFetchHook();
    const fetch = getHistogram(result, 'logs-a');

    const release = result.current.retainStreamHistogram(fetch);
    release();
    result.current.retainStreamHistogram(fetch);
    act(() => jest.runOnlyPendingTimers());

    expect(pendingQueries[0].signal.aborted).toBe(false);
    expect(getHistogram(result, 'logs-a')).toBe(fetch);
  });

  it('keeps a histogram that a render hands out again before the release runs', () => {
    const { result } = renderFetchHook();
    const fetch = getHistogram(result, 'logs-a');

    result.current.retainStreamHistogram(fetch)();
    expect(getHistogram(result, 'logs-a')).toBe(fetch);
    act(() => jest.runOnlyPendingTimers());

    expect(pendingQueries[0].signal.aborted).toBe(false);
    expect(getHistogram(result, 'logs-a')).toBe(fetch);
  });

  it('keeps finished histograms cached after release', async () => {
    const { result } = renderFetchHook();
    const fetch = getHistogram(result, 'logs-a');
    const release = result.current.retainStreamHistogram(fetch);

    pendingQueries[0].resolve({ columns: [], values: [] });
    await act(async () => {
      await fetch;
    });
    release();
    act(() => jest.runOnlyPendingTimers());

    expect(getHistogram(result, 'logs-a')).toBe(fetch);
    expect(mockExecuteEsqlQuery).toHaveBeenCalledTimes(1);
  });

  it('aborts every histogram when the time range changes', () => {
    const { result } = renderFetchHook();
    getHistogram(result, 'logs-a');
    getHistogram(result, 'logs-b');

    act(() => mockTimeState$.next({ kind: 'shift' }));

    expect(pendingQueries.every(({ signal }) => signal.aborted)).toBe(true);
  });
});
