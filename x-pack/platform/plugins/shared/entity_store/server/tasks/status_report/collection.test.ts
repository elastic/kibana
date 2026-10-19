/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runPart } from './collection';

describe('runPart', () => {
  const taskSignal = new AbortController().signal;

  it('returns the result and a complete outcome', async () => {
    const res = await runPart({
      part: 'p',
      deadline: Date.now() + 60_000,
      taskSignal,
      fn: async () => 42,
    });
    expect(res).toEqual(expect.objectContaining({ part: 'p', outcome: 'complete', result: 42 }));
  });

  it('reports failed when fn throws', async () => {
    const res = await runPart({
      part: 'p',
      deadline: Date.now() + 60_000,
      taskSignal,
      fn: async () => {
        throw new Error('boom');
      },
    });
    expect(res.outcome).toBe('failed');
    expect(res.result).toBeUndefined();
  });

  it('reports timed_out when the part timeout fires', async () => {
    const res = await runPart({
      part: 'p',
      timeoutMs: 20,
      deadline: Date.now() + 60_000,
      taskSignal,
      fn: (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    });
    expect(res.outcome).toBe('timed_out');
  });

  it('reports failed, not timed_out, when the task itself is aborted', async () => {
    const controller = new AbortController();
    const res = await runPart({
      part: 'p',
      deadline: Date.now() + 60_000,
      taskSignal: controller.signal,
      fn: (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')));
          controller.abort();
        }),
    });
    expect(res.outcome).toBe('failed');
  });

  it('skips without running when less than the timeout is left before the deadline', async () => {
    const fn = jest.fn();
    const res = await runPart({
      part: 'p',
      timeoutMs: 30_000,
      deadline: Date.now() + 1_000,
      taskSignal,
      fn,
    });
    expect(res).toEqual({ part: 'p', outcome: 'skipped', durationMs: 0 });
    expect(fn).not.toHaveBeenCalled();
  });
});
