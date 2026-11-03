/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchIndexDocCounts } from '../../../../services/api';
import { docCountApi, RequestResultType } from './get_doc_count';

jest.mock('../../../../services/api', () => ({
  fetchIndexDocCounts: jest.fn(),
}));

const fetchIndexDocCountsMock = jest.mocked(fetchIndexDocCounts);

const flushPromises = async () => {
  // Ensure we flush any chained microtasks created by Promises in rxjs operators.
  await Promise.resolve();
};

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('docCountApi', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
  });

  afterEach(() => {
    // rxjs bufferTime uses timers internally; ensure we don't leave any scheduled work around.
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('buffers requests within 100ms and posts a single batched request', async () => {
    fetchIndexDocCountsMock.mockResolvedValue({});

    const api = docCountApi();

    const emissions: Array<Record<string, any>> = [];
    const sub = api.getObservable().subscribe((v) => emissions.push(v));

    api.getByName('index-a');
    api.getByName('index-b');

    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(fetchIndexDocCountsMock).toHaveBeenCalledTimes(1);
    expect(fetchIndexDocCountsMock).toHaveBeenCalledWith(
      ['index-a', 'index-b'],
      expect.any(AbortSignal)
    );

    // Response is empty, but the client should still mark both indices as success with 0
    expect(emissions[emissions.length - 1]).toEqual({
      'index-a': { status: RequestResultType.Success, count: 0 },
      'index-b': { status: RequestResultType.Success, count: 0 },
    });

    sub.unsubscribe();
  });

  it('accumulates results across multiple batches', async () => {
    fetchIndexDocCountsMock
      .mockResolvedValueOnce({ 'index-a': 1 })
      .mockResolvedValueOnce({ 'index-b': 2 });

    const api = docCountApi();

    const emissions: Array<Record<string, any>> = [];
    const sub = api.getObservable().subscribe((v) => emissions.push(v));

    api.getByName('index-a');
    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(emissions[emissions.length - 1]).toEqual({
      'index-a': { status: RequestResultType.Success, count: 1 },
    });

    api.getByName('index-b');
    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(emissions[emissions.length - 1]).toEqual({
      'index-a': { status: RequestResultType.Success, count: 1 },
      'index-b': { status: RequestResultType.Success, count: 2 },
    });

    sub.unsubscribe();
  });

  it('marks only indices from a failed batch as errored and does not override existing successes', async () => {
    fetchIndexDocCountsMock
      .mockResolvedValueOnce({ 'index-a': 3 })
      .mockRejectedValueOnce(new Error('boom'));

    const api = docCountApi();

    const emissions: Array<Record<string, any>> = [];
    const sub = api.getObservable().subscribe((v) => emissions.push(v));

    // First: index-a succeeds
    api.getByName('index-a');
    jest.advanceTimersByTime(100);
    await flushPromises();

    // Second: batch with index-a (already known) and index-b fails; only index-b should become error
    api.getByName('index-a');
    api.getByName('index-b');
    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(emissions[emissions.length - 1]).toEqual({
      'index-a': { status: RequestResultType.Success, count: 3 },
      'index-b': { status: RequestResultType.Error },
    });

    sub.unsubscribe();
  });

  it('replays the latest accumulated map to a late subscriber without issuing a new request', async () => {
    fetchIndexDocCountsMock.mockResolvedValue({ 'index-a': 42 });

    const api = docCountApi();

    // Early subscriber triggers the first batch.
    const earlyEmissions: Array<Record<string, any>> = [];
    const earlySub = api.getObservable().subscribe((v) => earlyEmissions.push(v));

    api.getByName('index-a');
    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(fetchIndexDocCountsMock).toHaveBeenCalledTimes(1);
    expect(earlyEmissions[earlyEmissions.length - 1]).toEqual({
      'index-a': { status: RequestResultType.Success, count: 42 },
    });

    // Late subscriber attaches after the first emission has already occurred.
    const lateEmissions: Array<Record<string, any>> = [];
    const lateSub = api.getObservable().subscribe((v) => lateEmissions.push(v));

    // shareReplay must replay the buffered state synchronously — no timers or promises needed.
    expect(lateEmissions).toEqual([
      { 'index-a': { status: RequestResultType.Success, count: 42 } },
    ]);

    // No additional HTTP request should have been made.
    expect(fetchIndexDocCountsMock).toHaveBeenCalledTimes(1);

    earlySub.unsubscribe();
    lateSub.unsubscribe();
  });

  it('does not emit error results for an aborted in-flight request', async () => {
    const d = deferred<Record<string, number>>();
    fetchIndexDocCountsMock.mockReturnValue(d.promise);

    const api = docCountApi();

    const emissions: Array<Record<string, any>> = [];
    const sub = api.getObservable().subscribe((v) => emissions.push(v));

    api.getByName('index-a');
    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(fetchIndexDocCountsMock).toHaveBeenCalledTimes(1);
    const signal = fetchIndexDocCountsMock.mock.calls[0]?.[1];
    expect(signal).toBeInstanceOf(AbortSignal);

    api.abort();
    expect(signal?.aborted).toBe(true);

    d.reject(new Error('boom'));
    await flushPromises();

    // Aborted requests should not produce an "error" emission.
    expect(emissions).toEqual([]);

    sub.unsubscribe();
  });
});
