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
  let task: jest.Mock<Promise<void>, []>;
  beforeEach(() => {
    online$ = new Subject();
    task = jest.fn();
  });

  const subscribe = () => online$.pipe(switchMap(createOnlineStatusTaskRunner(task))).subscribe();

  it('runs the task', async () => {
    task.mockResolvedValue();
    subscribe();

    const scheduleRetry = jest.fn();
    online$.next({ scheduleRetry });
    await nextTick();

    expect(task).toHaveBeenCalledTimes(1);
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

  it('waits for the running task to finish before starting a newer run', async () => {
    const firstRun = createDeferred();
    const events: string[] = [];
    task
      .mockImplementationOnce(async () => {
        events.push('first started');
        await firstRun.promise;
        events.push('first finished');
      })
      .mockImplementation(async () => {
        events.push('second started');
      });
    subscribe();

    online$.next({ scheduleRetry: jest.fn() });
    await nextTick();

    online$.next({ scheduleRetry: jest.fn() });
    await nextTick();
    expect(events).toEqual(['first started']);

    firstRun.resolve();
    await nextTick();

    expect(events).toEqual(['first started', 'first finished', 'second started']);
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
    firstRun.reject(new Error('Some error'));
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
  });

  it(`doesn't schedule a retry when a run fails after unsubscribe`, async () => {
    const firstRun = createDeferred();
    task.mockReturnValueOnce(firstRun.promise);
    const subscription = subscribe();

    const scheduleRetry = jest.fn();
    online$.next({ scheduleRetry });
    await nextTick();

    subscription.unsubscribe();
    firstRun.reject(new Error('Some error'));
    await nextTick();

    expect(scheduleRetry).not.toHaveBeenCalled();
  });
});
