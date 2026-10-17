/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, switchMap } from 'rxjs';

import { nextTick } from '@kbn/test-jest-helpers';

import type { OnlineStatusRetryScheduler } from './elasticsearch_service';
import { createOnlineStatusTaskRunner } from './online_status_task_runner';

const createDeferred = () => {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('createOnlineStatusTaskRunner', () => {
  let online$: Subject<OnlineStatusRetryScheduler>;
  let task: jest.Mock<Promise<void>, [AbortSignal]>;
  // The runner aborts a signal once its run completes too, so record what the task saw on entry.
  let abortedOnEntry: boolean[];
  beforeEach(() => {
    online$ = new Subject();
    abortedOnEntry = [];
    task = jest.fn();
  });

  const subscribe = () =>
    online$
      .pipe(
        switchMap(
          createOnlineStatusTaskRunner((signal) => {
            abortedOnEntry.push(signal.aborted);
            return task(signal);
          })
        )
      )
      .subscribe();

  it('runs the task with a signal that is not aborted', async () => {
    task.mockResolvedValue();
    subscribe();

    const scheduleRetry = jest.fn();
    online$.next({ scheduleRetry });
    await nextTick();

    expect(task).toHaveBeenCalledTimes(1);
    expect(abortedOnEntry).toEqual([false]);
    expect(scheduleRetry).not.toHaveBeenCalled();
  });

  it('schedules a retry when the current run fails', async () => {
    task.mockRejectedValue(new Error('Some error'));
    subscribe();

    const scheduleRetry = jest.fn();
    online$.next({ scheduleRetry });
    await nextTick();

    expect(scheduleRetry).toHaveBeenCalledTimes(1);
  });

  it('aborts the running task when a newer status arrives, and waits for it to settle', async () => {
    const firstRun = createDeferred();
    task.mockReturnValueOnce(firstRun.promise).mockResolvedValue();
    subscribe();

    online$.next({ scheduleRetry: jest.fn() });
    await nextTick();
    const [[firstSignal]] = task.mock.calls;

    online$.next({ scheduleRetry: jest.fn() });
    await nextTick();

    expect(firstSignal.aborted).toBe(true);
    expect(task).toHaveBeenCalledTimes(1);

    firstRun.resolve();
    await nextTick();

    expect(task).toHaveBeenCalledTimes(2);
    expect(abortedOnEntry).toEqual([false, false]);
  });

  it(`doesn't schedule a retry when a replaced run fails`, async () => {
    const firstRun = createDeferred();
    task.mockReturnValueOnce(firstRun.promise).mockResolvedValue();
    subscribe();

    const firstScheduleRetry = jest.fn();
    online$.next({ scheduleRetry: firstScheduleRetry });
    await nextTick();

    const secondScheduleRetry = jest.fn();
    online$.next({ scheduleRetry: secondScheduleRetry });
    firstRun.reject(new Error('Aborted'));
    await nextTick();

    expect(firstScheduleRetry).not.toHaveBeenCalled();
    expect(secondScheduleRetry).not.toHaveBeenCalled();
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('skips runs that were replaced before they started', async () => {
    const firstRun = createDeferred();
    task.mockReturnValueOnce(firstRun.promise).mockResolvedValue();
    subscribe();

    online$.next({ scheduleRetry: jest.fn() });
    await nextTick();

    online$.next({ scheduleRetry: jest.fn() });
    online$.next({ scheduleRetry: jest.fn() });
    firstRun.resolve();
    await nextTick();

    // The second run was replaced while it waited for the first, so only the third one runs.
    expect(task).toHaveBeenCalledTimes(2);
    expect(abortedOnEntry).toEqual([false, false]);
  });

  it('aborts the running task on unsubscribe', async () => {
    const firstRun = createDeferred();
    task.mockReturnValueOnce(firstRun.promise);
    const subscription = subscribe();

    const scheduleRetry = jest.fn();
    online$.next({ scheduleRetry });
    await nextTick();
    const [[signal]] = task.mock.calls;

    subscription.unsubscribe();
    firstRun.reject(new Error('Aborted'));
    await nextTick();

    expect(signal.aborted).toBe(true);
    expect(scheduleRetry).not.toHaveBeenCalled();
  });
});
