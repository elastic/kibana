/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTERNAL_API_BASE_PATH } from '../../../../../../common/constants';

import { docCountApi, RequestResultType } from './get_doc_count';

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
    jest.clearAllMocks();
  });

  afterEach(() => {
    // rxjs bufferTime uses timers internally; ensure we don't leave any scheduled work around.
    jest.runOnlyPendingTimers();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('buffers requests within 100ms and posts a single batched request', async () => {
    const httpSetup = {
      post: jest.fn().mockResolvedValue({}),
    } as any;

    const api = docCountApi(httpSetup);

    const emissions: Array<Record<string, any>> = [];
    const sub = api.getObservable().subscribe((v) => emissions.push(v));

    api.getByName('index-a');
    api.getByName('index-b');

    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(httpSetup.post).toHaveBeenCalledTimes(1);
    expect(httpSetup.post).toHaveBeenCalledWith(`${INTERNAL_API_BASE_PATH}/index_doc_count`, {
      body: JSON.stringify({ indexNames: ['index-a', 'index-b'] }),
      signal: expect.any(AbortSignal),
    });

    // Response is empty, but the client should still mark both indices as success with 0
    expect(emissions[emissions.length - 1]).toEqual({
      'index-a': { status: RequestResultType.Success, count: 0 },
      'index-b': { status: RequestResultType.Success, count: 0 },
    });

    sub.unsubscribe();
  });

  it('accumulates results across multiple batches', async () => {
    const httpSetup = {
      post: jest
        .fn()
        .mockResolvedValueOnce({ 'index-a': 1 })
        .mockResolvedValueOnce({ 'index-b': 2 }),
    } as any;

    const api = docCountApi(httpSetup);

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
    const httpSetup = {
      post: jest
        .fn()
        .mockResolvedValueOnce({ 'index-a': 3 })
        .mockRejectedValueOnce(new Error('boom')),
    } as any;

    const api = docCountApi(httpSetup);

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

  it('does not emit error results for an aborted in-flight request', async () => {
    const d = deferred<Record<string, number>>();
    const httpSetup = {
      post: jest.fn(() => d.promise),
    } as any;

    const api = docCountApi(httpSetup);

    const emissions: Array<Record<string, any>> = [];
    const sub = api.getObservable().subscribe((v) => emissions.push(v));

    api.getByName('index-a');
    jest.advanceTimersByTime(100);
    await flushPromises();

    expect(httpSetup.post).toHaveBeenCalledTimes(1);
    const signal = (httpSetup.post as jest.Mock).mock.calls[0]?.[1]?.signal as AbortSignal;
    expect(signal).toBeInstanceOf(AbortSignal);

    api.abort();
    expect(signal.aborted).toBe(true);

    d.reject(new Error('boom'));
    await flushPromises();

    // Aborted requests should not produce an "error" emission.
    expect(emissions).toEqual([]);

    sub.unsubscribe();
  });
});
