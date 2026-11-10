/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RenderBusyError, createLimiter } from './limiter';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('createLimiter', () => {
  it('runs at most inFlight at once, queues the rest in order, and refuses past the queue', async () => {
    const limit = createLimiter(2, 1);
    const gates = [deferred(), deferred(), deferred()];
    const order: number[] = [];
    const runs = gates.map((gate, index) =>
      limit(async () => {
        order.push(index);
        await gate.promise;
        return index;
      })
    );
    await expect(limit(async () => 'late')).rejects.toBeInstanceOf(RenderBusyError);
    await flush();
    expect(order).toEqual([0, 1]);
    expect(limit.running).toBe(2);
    expect(limit.queued).toBe(1);
    gates[0].resolve();
    await runs[0];
    await flush();
    expect(order).toEqual([0, 1, 2]);
    gates[1].resolve();
    gates[2].resolve();
    await expect(Promise.all(runs)).resolves.toEqual([0, 1, 2]);
    expect(limit.running).toBe(0);
  });

  it('frees a slot when a render throws', async () => {
    const limit = createLimiter(1, 0);
    await expect(
      limit(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');
    await expect(limit(async () => 'next')).resolves.toBe('next');
  });
});
