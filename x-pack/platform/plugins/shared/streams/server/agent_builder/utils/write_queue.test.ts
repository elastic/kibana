/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';
import type { KibanaRequest } from '@kbn/core-http-server';
import { StreamsWriteQueue, abortSignalFromRequest } from './write_queue';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('StreamsWriteQueue', () => {
  it('executes a single operation and returns its result', async () => {
    const queue = new StreamsWriteQueue();
    const result = await queue.enqueue(() => Promise.resolve('done'));
    expect(result).toBe('done');
  });

  it('serializes concurrent operations in FIFO order', async () => {
    const queue = new StreamsWriteQueue();
    const order: number[] = [];

    const p1 = queue.enqueue(async () => {
      await delay(30);
      order.push(1);
      return 'a';
    });

    const p2 = queue.enqueue(async () => {
      order.push(2);
      return 'b';
    });

    const p3 = queue.enqueue(async () => {
      order.push(3);
      return 'c';
    });

    const results = await Promise.all([p1, p2, p3]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(order).toEqual([1, 2, 3]);
  });

  it('propagates errors without breaking the queue', async () => {
    const queue = new StreamsWriteQueue();

    const p1 = queue.enqueue(() => Promise.reject(new Error('boom')));
    const p2 = queue.enqueue(() => Promise.resolve('ok'));

    await expect(p1).rejects.toThrow('boom');
    await expect(p2).resolves.toBe('ok');
  });

  it('rejects immediately if the signal is already aborted', async () => {
    const queue = new StreamsWriteQueue();
    const controller = new AbortController();
    controller.abort();

    const result = queue
      .enqueue(() => Promise.resolve('nope'), controller.signal)
      .then(
        () => 'resolved',
        (err: Error) => err.message
      );

    expect(await result).toBe('Operation cancelled');
  });

  it('cancels a queued operation when the signal fires before execution', async () => {
    const queue = new StreamsWriteQueue();
    const controller = new AbortController();

    const p1 = queue.enqueue(async () => {
      await delay(50);
      return 'first';
    });

    const p2 = queue.enqueue(() => Promise.resolve('second'), controller.signal);
    // Attach rejection handler immediately to avoid unhandled rejection warning
    const p2Result = p2.then(
      () => 'resolved',
      (err: Error) => err.message
    );

    // Abort while p2 is waiting in the queue behind p1
    controller.abort();

    await expect(p1).resolves.toBe('first');
    expect(await p2Result).toBe('Operation cancelled');
  });

  it('does not cancel an operation that is already executing', async () => {
    const queue = new StreamsWriteQueue();
    const controller = new AbortController();

    const p1 = queue.enqueue(async () => {
      await delay(30);
      return 'executed';
    }, controller.signal);

    // Abort after execution has started
    await delay(5);
    controller.abort();

    await expect(p1).resolves.toBe('executed');
  });

  it('continues processing after a cancelled item', async () => {
    const queue = new StreamsWriteQueue();
    const controller = new AbortController();

    const p1 = queue.enqueue(async () => {
      await delay(30);
      return 'first';
    });

    const p2 = queue.enqueue(() => Promise.resolve('cancelled'), controller.signal);
    const p2Result = p2.then(
      () => 'resolved',
      (err: Error) => err.message
    );
    const p3 = queue.enqueue(() => Promise.resolve('third'));

    controller.abort();

    await expect(p1).resolves.toBe('first');
    expect(await p2Result).toBe('Operation cancelled');
    await expect(p3).resolves.toBe('third');
  });
});

describe('abortSignalFromRequest', () => {
  it('returns an AbortSignal that fires when the request is aborted', () => {
    const aborted$ = new Subject<void>();
    const request = { events: { aborted$ } } as unknown as KibanaRequest;

    const signal = abortSignalFromRequest(request);
    expect(signal.aborted).toBe(false);

    aborted$.next();
    expect(signal.aborted).toBe(true);
  });
});
