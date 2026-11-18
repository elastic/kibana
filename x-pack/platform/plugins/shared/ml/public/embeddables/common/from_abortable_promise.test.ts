/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { fromAbortablePromise } from './from_abortable_promise';

describe('fromAbortablePromise', () => {
  it('emits the task result', async () => {
    await expect(lastValueFrom(fromAbortablePromise(() => Promise.resolve(42)))).resolves.toBe(42);
  });

  it('propagates task errors', async () => {
    await expect(
      lastValueFrom(fromAbortablePromise(() => Promise.reject(new Error('boom'))))
    ).rejects.toThrow('boom');
  });

  it('aborts the task signal when unsubscribed', () => {
    let taskSignal: AbortSignal | undefined;
    const subscription = fromAbortablePromise((signal) => {
      taskSignal = signal;
      return new Promise<void>(() => {});
    }).subscribe();

    expect(taskSignal?.aborted).toBe(false);
    subscription.unsubscribe();
    expect(taskSignal?.aborted).toBe(true);
  });

  it('does not start the task when the parent signal is already aborted', async () => {
    const task = jest.fn(() => Promise.resolve(1));
    const controller = new AbortController();
    controller.abort();

    await expect(
      lastValueFrom(fromAbortablePromise(task, controller.signal), { defaultValue: 'empty' })
    ).resolves.toBe('empty');
    expect(task).not.toHaveBeenCalled();
  });

  it('aborts the task and completes without emitting when the parent signal aborts', async () => {
    let taskSignal: AbortSignal | undefined;
    const controller = new AbortController();
    const result = lastValueFrom(
      fromAbortablePromise((signal) => {
        taskSignal = signal;
        return new Promise<number>((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
      }, controller.signal),
      { defaultValue: 'empty' }
    );

    controller.abort('canceled');

    await expect(result).resolves.toBe('empty');
    expect(taskSignal?.aborted).toBe(true);
    expect(taskSignal?.reason).toBe('canceled');
  });
});
