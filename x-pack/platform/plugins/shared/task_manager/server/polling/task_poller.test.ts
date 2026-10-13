/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { of, BehaviorSubject, Subject } from 'rxjs';
import { none } from 'fp-ts/Option';
import { createTaskPoller, PollingError, PollingErrorType } from './task_poller';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { asOk, asErr } from '../lib/result_type';

describe('TaskPoller', () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  });

  afterEach(() => clock.restore());

  test('intializes the poller with the provided interval', async () => {
    const pollInterval = 100;
    const halfInterval = Math.floor(pollInterval / 2);

    const work = jest.fn(async () => true);
    createTaskPoller<void, boolean>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$: of(pollInterval),
      getCapacity: () => 1,
      work,
    }).start();

    expect(work).toHaveBeenCalledTimes(1);

    // `work` is async, we have to force a node `tick`
    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(halfInterval);
    expect(work).toHaveBeenCalledTimes(1);
    clock.tick(halfInterval);

    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(2);

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval + 10);
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(3);
  });

  test('poller adapts to pollInterval changes', async () => {
    const pollInterval = 100;
    const pollInterval$ = new BehaviorSubject(pollInterval);

    const work = jest.fn(async () => true);
    createTaskPoller<void, boolean>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$,
      getCapacity: () => 1,
      work,
    }).start();

    expect(work).toHaveBeenCalledTimes(1);

    // `work` is async, we have to force a node `tick`
    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(2);

    pollInterval$.next(pollInterval * 2);

    // `work` is async, we have to force a node `tick`
    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(2);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    pollInterval$.next(pollInterval / 2);

    // `work` is async, we have to force a node `tick`
    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval / 2);
    expect(work).toHaveBeenCalledTimes(4);
  });

  test('poller ignores null pollInterval values', async () => {
    const pollInterval = 100;
    const pollInterval$ = new BehaviorSubject(pollInterval);

    const work = jest.fn(async () => true);
    const logger = loggingSystemMock.create().get();
    createTaskPoller<void, boolean>({
      initialPollInterval: pollInterval,
      logger,
      pollInterval$,
      getCapacity: () => 1,
      work,
    }).start();

    expect(work).toHaveBeenCalledTimes(1);

    // `work` is async, we have to force a node `tick`
    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(2);

    pollInterval$.next(pollInterval * 2);

    // `work` is async, we have to force a node `tick`
    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(2);
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    // Force null into the events
    pollInterval$.next(null as unknown as number);

    // `work` is async, we have to force a node `tick`
    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    // `work` is async, we have to force a node `tick`
    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(4);

    expect(logger.error).toHaveBeenCalledWith(
      new Error(
        'Expected the new interval to be a number > 0, received: null but poller will keep using: 200'
      )
    );
  });

  test('filters interval polling on capacity', async () => {
    const pollInterval = 100;

    const work = jest.fn(async () => true);

    let hasCapacity = true;
    createTaskPoller<void, boolean>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$: of(pollInterval),
      work,
      getCapacity: () => (hasCapacity ? 1 : 0),
    }).start();

    expect(work).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(2);

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    hasCapacity = false;

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(3);

    hasCapacity = true;

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(4);

    await new Promise((resolve) => setImmediate(resolve));
    clock.tick(pollInterval);
    expect(work).toHaveBeenCalledTimes(5);
  });

  test('waits for work to complete before emitting the next event', async () => {
    const pollInterval = 100;

    const { promise: worker, resolve: resolveWorker } = createResolvablePromise();

    const handler = jest.fn();
    const poller = createTaskPoller<string, string[]>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$: of(pollInterval),
      work: async (...args) => {
        await worker;
        return args;
      },
      getCapacity: () => 5,
    });
    poller.events$.subscribe(handler);
    poller.start();

    clock.tick(pollInterval);

    // work should now be in progress

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledTimes(0);

    resolveWorker({});

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledTimes(1);

    clock.tick(pollInterval);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('returns an error when polling for work fails', async () => {
    const pollInterval = 100;

    const handler = jest.fn();
    const workError = new Error('failed to work');
    const poller = createTaskPoller<string, string[]>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$: of(pollInterval),
      work: async (...args) => {
        throw workError;
      },
      getCapacity: () => 5,
    });
    poller.events$.subscribe(handler);
    poller.start();

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));

    const expectedError = new PollingError<string>(
      'Failed to poll for work: failed to work',
      PollingErrorType.WorkError,
      none
    );
    expect(handler).toHaveBeenCalledWith(asErr(expectedError));
    expect(handler.mock.calls[0][0].error.type).toEqual(PollingErrorType.WorkError);
    expect(handler.mock.calls[0][0].error.stack).toContain(workError.stack);
  });

  test('still logs errors when they are thrown as strings', async () => {
    const pollInterval = 100;

    const handler = jest.fn();
    const workError = 'failed to work';
    const poller = createTaskPoller<string, string[]>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$: of(pollInterval),
      work: async (...args) => {
        throw workError;
      },
      getCapacity: () => 5,
    });
    poller.events$.subscribe(handler);
    poller.start();

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));

    const expectedError = new PollingError<string>(
      'Failed to poll for work: failed to work',
      PollingErrorType.WorkError,
      none
    );
    expect(handler).toHaveBeenCalledWith(asErr(expectedError));
    expect(handler.mock.calls[0][0].error.type).toEqual(PollingErrorType.WorkError);
    expect(handler.mock.calls[0][0].error.stack).toBeDefined();
  });

  test('continues polling after work fails', async () => {
    const pollInterval = 100;

    const handler = jest.fn();
    let callCount = 0;
    const workError = new Error('failed to work');
    const work = jest.fn(async () => {
      callCount++;
      if (callCount === 2) {
        throw workError;
      }
      return callCount;
    });
    const poller = createTaskPoller<string, number>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$: of(pollInterval),
      work,
      getCapacity: () => 5,
    });
    poller.events$.subscribe(handler);
    poller.start();

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledWith(asOk(1));

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));

    const expectedError = new PollingError<string>(
      'Failed to poll for work: failed to work',
      PollingErrorType.WorkError,
      none
    );
    expect(handler).toHaveBeenCalledWith(asErr(expectedError));
    expect(handler.mock.calls[1][0].error.type).toEqual(PollingErrorType.WorkError);
    expect(handler.mock.calls[1][0].error.stack).toContain(workError.stack);
    expect(handler).not.toHaveBeenCalledWith(asOk(2));

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledWith(asOk(3));
  });

  test('continues polling if getCapacity throws error fails', async () => {
    const pollInterval = 100;

    const handler = jest.fn();
    let callCount = 0;
    const work = jest.fn(async () => callCount);
    const poller = createTaskPoller<string, number>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$: of(pollInterval),
      work,
      getCapacity: () => {
        callCount++;
        if (callCount === 2) {
          throw new Error('error getting capacity');
        }
        return 2;
      },
    });
    poller.events$.subscribe(handler);
    poller.start();

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledWith(asOk(1));

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));

    const expectedError = new PollingError<string>(
      'Failed to poll for work: error getting capacity',
      PollingErrorType.WorkError,
      none
    );
    expect(handler).toHaveBeenCalledWith(asErr(expectedError));
    expect(handler.mock.calls[1][0].error.type).toEqual(PollingErrorType.WorkError);
    expect(handler).not.toHaveBeenCalledWith(asOk(2));

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));

    expect(handler).toHaveBeenCalledWith(asOk(3));
  });

  test(`doesn't start polling until start is called`, async () => {
    const pollInterval = 100;

    const work = jest.fn(async () => true);
    const taskPoller = createTaskPoller<void, boolean>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$: of(pollInterval),
      getCapacity: () => 1,
      work,
    });

    expect(work).toHaveBeenCalledTimes(0);

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(0);

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(0);

    // Start the poller here
    taskPoller.start();
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(1);

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(2);
  });

  test(`stops polling after stop is called`, async () => {
    const pollInterval = 100;

    const work = jest.fn(async () => true);
    const taskPoller = createTaskPoller<void, boolean>({
      initialPollInterval: pollInterval,
      logger: loggingSystemMock.create().get(),
      pollInterval$: of(pollInterval),
      getCapacity: () => 1,
      work,
    });

    taskPoller.start();
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(1);

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(2);

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(3);

    // Stop the poller here
    taskPoller.stop();
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(3);

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(3);

    clock.tick(pollInterval);
    await new Promise((resolve) => setImmediate(resolve));
    expect(work).toHaveBeenCalledTimes(3);
  });
  describe('claimNudge$', () => {
    test('runs one trailing claim for a burst while polling at 3s, then resumes regular polling', async () => {
      const claimNudge$ = new Subject<void>();
      const claimTimes: number[] = [];
      const poller = createTaskPoller({
        initialPollInterval: 3000,
        logger: loggingSystemMock.createLogger(),
        pollInterval$: of(3000),
        claimNudge$,
        getCapacity: () => 1,
        work: async () => claimTimes.push(Date.now()),
      });
      poller.start();
      await clock.tickAsync(100);
      claimNudge$.next();
      await clock.tickAsync(100);
      claimNudge$.next();
      claimNudge$.next();
      await clock.tickAsync(399);
      expect(claimTimes).toEqual([0, 100]);
      await clock.tickAsync(1);
      expect(claimTimes).toEqual([0, 100, 600]);
      await clock.tickAsync(2999);
      expect(claimTimes).toEqual([0, 100, 600]);
      await clock.tickAsync(1);
      expect(claimTimes).toEqual([0, 100, 600, 3600]);
      poller.stop();
    });

    test('coalesces the trailing and regular claim when polling returns to 500ms', async () => {
      const claimNudge$ = new Subject<void>();
      const pollInterval$ = new BehaviorSubject(3000);
      const claimTimes: number[] = [];
      const { promise, resolve } = createResolvablePromise();
      const poller = createTaskPoller({
        initialPollInterval: 3000,
        logger: loggingSystemMock.createLogger(),
        pollInterval$,
        claimNudge$,
        getCapacity: () => 1,
        work: async () => {
          claimTimes.push(Date.now());
          if (claimTimes.length === 3) {
            await promise;
          }
        },
      });
      poller.start();
      await clock.tickAsync(100);
      claimNudge$.next();
      await clock.tickAsync(100);
      claimNudge$.next();
      await clock.tickAsync(200);
      pollInterval$.next(500);
      await clock.tickAsync(200);
      expect(claimTimes).toEqual([0, 100, 600]);
      resolve(true);
      await clock.tickAsync(1);
      // The trailing timer cannot queue a redundant claim behind the regular one at 600ms.
      expect(claimTimes).toEqual([0, 100, 600]);
      await clock.tickAsync(499);
      expect(claimTimes).toEqual([0, 100, 600, 1100]);
      poller.stop();
    });

    test('serializes a trailing nudge behind an in-flight claim', async () => {
      const claimNudge$ = new Subject<void>();
      const { promise, resolve } = createResolvablePromise();
      const work = jest.fn(async () => true);
      const poller = createTaskPoller({
        initialPollInterval: 3000,
        logger: loggingSystemMock.createLogger(),
        pollInterval$: of(3000),
        claimNudge$,
        getCapacity: () => 1,
        work,
      });
      poller.start();
      await clock.tickAsync(100);
      work.mockImplementationOnce(async () => {
        await promise;
        return true;
      });
      claimNudge$.next();
      await clock.tickAsync(100);
      claimNudge$.next();
      claimNudge$.next();
      await clock.tickAsync(400);
      expect(work).toHaveBeenCalledTimes(2);
      resolve(true);
      await clock.tickAsync(1);
      expect(work).toHaveBeenCalledTimes(3);
      await clock.tickAsync(500);
      expect(work).toHaveBeenCalledTimes(3);
      poller.stop();
    });

    test('cancels a trailing nudge on stop', async () => {
      const claimNudge$ = new Subject<void>();
      const work = jest.fn(async () => true);
      const poller = createTaskPoller({
        initialPollInterval: 3000,
        logger: loggingSystemMock.createLogger(),
        pollInterval$: of(3000),
        claimNudge$,
        getCapacity: () => 1,
        work,
      });
      poller.start();
      await clock.tickAsync(100);
      claimNudge$.next();
      await clock.tickAsync(100);
      claimNudge$.next();
      poller.stop();
      expect(clock.countTimers()).toBe(0);
      expect(claimNudge$.observed).toBe(false);
      await clock.tickAsync(3000);
      expect(work).toHaveBeenCalledTimes(2);
    });

    test('triggers an immediate cycle when a claim nudge arrives between polls', async () => {
      const pollInterval = 1000;

      const work = jest.fn(async () => true);
      const claimNudge$ = new Subject<void>();
      createTaskPoller<void, boolean>({
        initialPollInterval: pollInterval,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(pollInterval),
        claimNudge$,
        getCapacity: () => 1,
        work,
      }).start();

      // initial cycle runs synchronously on start()
      expect(work).toHaveBeenCalledTimes(1);
      await new Promise((resolve) => setImmediate(resolve));

      clock.tick(pollInterval / 4);
      expect(work).toHaveBeenCalledTimes(1);

      claimNudge$.next();
      await new Promise((resolve) => setImmediate(resolve));

      expect(work).toHaveBeenCalledTimes(2);

      // The next regular cycle is one interval after the actual nudged cycle.
      clock.tick(pollInterval - 1);
      expect(work).toHaveBeenCalledTimes(2);
      clock.tick(1);
      await new Promise((resolve) => setImmediate(resolve));
      expect(work).toHaveBeenCalledTimes(3);
    });

    test('starts the next interval from the broadcast nudge on each node', async () => {
      const claimNudge$ = new Subject<void>();
      const calls: number[][] = [[], []];
      const pollers = calls.map((times) =>
        createTaskPoller({
          initialPollInterval: 1000,
          logger: loggingSystemMock.createLogger(),
          pollInterval$: of(1000),
          claimNudge$,
          getCapacity: () => 1,
          work: async () => times.push(Date.now()),
        })
      );
      pollers[0].start();
      await clock.tickAsync(300);
      pollers[1].start();
      await clock.tickAsync(200);
      claimNudge$.next();
      await new Promise((resolve) => setImmediate(resolve));
      for (const elapsed of [1000, 1000]) {
        clock.tick(elapsed);
        await new Promise((resolve) => setImmediate(resolve));
      }
      expect(calls).toEqual([
        [0, 500, 1500, 2500],
        [300, 500, 1500, 2500],
      ]);
      pollers.forEach((poller) => poller.stop());
    });

    test.each([false, true])(
      'checks capacity on a nudge and again one interval later (capacity: %s)',
      async (capacity) => {
        const claimNudge$ = new Subject<void>();
        const checks: number[] = [];
        const poller = createTaskPoller({
          initialPollInterval: 1000,
          logger: loggingSystemMock.createLogger(),
          pollInterval$: of(1000),
          claimNudge$,
          getCapacity: () => {
            checks.push(Date.now());
            return capacity ? 1 : 0;
          },
          work: async () => true,
        });
        poller.start();
        await clock.tickAsync(999);
        claimNudge$.next();
        await clock.tickAsync(1);
        // availableCapacity also cancels expired tasks, even when the pool is full.
        expect(checks).toEqual([0, 999]);
        await clock.tickAsync(999);
        expect(checks).toEqual([0, 999, 1999]);
        poller.stop();
      }
    );

    test('coalesces overdue regular polls and queued nudges after a long claim', async () => {
      const claimNudge$ = new Subject<void>();
      const { promise, resolve } = createResolvablePromise();
      const work = jest
        .fn(async () => true)
        .mockImplementationOnce(async () => {
          await promise;
          return true;
        });
      const poller = createTaskPoller({
        initialPollInterval: 1000,
        logger: loggingSystemMock.createLogger(),
        pollInterval$: of(1000),
        claimNudge$,
        getCapacity: () => 1,
        work,
      });
      poller.start();
      await clock.tickAsync(2500);
      claimNudge$.next();
      claimNudge$.next();
      expect(work).toHaveBeenCalledTimes(1);
      resolve(true);
      await clock.tickAsync(0);
      expect(work).toHaveBeenCalledTimes(2);
      await clock.tickAsync(999);
      expect(work).toHaveBeenCalledTimes(2);
      await clock.tickAsync(1);
      expect(work).toHaveBeenCalledTimes(3);
      poller.stop();
    });

    test('discards a queued nudge when a claim enters backpressure', async () => {
      const claimNudge$ = new Subject<void>();
      const backpressure$ = new BehaviorSubject(false);
      const pollInterval$ = new BehaviorSubject(1000);
      const { promise, resolve } = createResolvablePromise();
      const work = jest
        .fn(async () => true)
        .mockImplementationOnce(async () => {
          await promise;
          pollInterval$.next(61_000);
          backpressure$.next(true);
          return true;
        });
      const poller = createTaskPoller({
        initialPollInterval: 1000,
        logger: loggingSystemMock.createLogger(),
        pollInterval$,
        claimNudge$,
        backpressure$,
        getCapacity: () => 1,
        work,
      });
      poller.start();
      await clock.tickAsync(100);
      claimNudge$.next();
      resolve(true);
      await clock.tickAsync(1000);
      expect(work).toHaveBeenCalledTimes(1);
      // Recovery must not replay the discarded nudge.
      backpressure$.next(false);
      await clock.tickAsync(59_900);
      expect(work).toHaveBeenCalledTimes(2);
      poller.stop();
    });

    test('discards a queued nudge even if backpressure recovers before the claim finishes', async () => {
      const claimNudge$ = new Subject<void>();
      const backpressure$ = new BehaviorSubject(false);
      const { promise, resolve } = createResolvablePromise();
      const work = jest
        .fn(async () => true)
        .mockImplementationOnce(async () => {
          await promise;
          return true;
        });
      const poller = createTaskPoller({
        initialPollInterval: 120_000,
        logger: loggingSystemMock.createLogger(),
        pollInterval$: of(120_000),
        claimNudge$,
        backpressure$,
        getCapacity: () => 1,
        work,
      });

      try {
        poller.start();
        await clock.tickAsync(100);
        claimNudge$.next();
        await clock.tickAsync(9_900);
        backpressure$.next(true);
        await clock.tickAsync(90_000);
        backpressure$.next(false);
        await clock.tickAsync(10_000);
        resolve(true);
        await clock.tickAsync(1);
        expect(work).toHaveBeenCalledTimes(1);

        // The original regular deadline survives; the discarded nudge must not run at recovery.
        await clock.tickAsync(9_999);
        expect(work).toHaveBeenCalledTimes(2);
      } finally {
        poller.stop();
      }
    });

    test('reschedules an idle regular deadline when the managed interval changes', async () => {
      const pollInterval$ = new BehaviorSubject(1000);
      const work = jest.fn(async () => true);
      const poller = createTaskPoller({
        initialPollInterval: 1000,
        logger: loggingSystemMock.createLogger(),
        pollInterval$,
        getCapacity: () => 1,
        work,
      });
      poller.start();
      await clock.tickAsync(500);
      pollInterval$.next(61_000);
      await clock.tickAsync(1000);
      expect(work).toHaveBeenCalledTimes(1);
      pollInterval$.next(2000);
      await clock.tickAsync(500);
      expect(work).toHaveBeenCalledTimes(2);
      poller.stop();
    });

    test('cancels deferred subscriptions on same-tick stop and restarts only once', async () => {
      const claimNudge$ = new Subject<void>();
      const pollInterval$ = new Subject<number>();
      const work = jest.fn(async () => true);
      const poller = createTaskPoller({
        initialPollInterval: 1000,
        logger: loggingSystemMock.createLogger(),
        pollInterval$,
        claimNudge$,
        getCapacity: () => 1,
        work,
      });
      poller.start();
      poller.stop();
      await clock.tickAsync(0);
      expect(claimNudge$.observed).toBe(false);
      expect(pollInterval$.observed).toBe(false);
      expect(clock.countTimers()).toBe(0);
      poller.start();
      poller.start();
      await clock.tickAsync(0);
      expect(claimNudge$.observers).toHaveLength(1);
      expect(pollInterval$.observers).toHaveLength(1);
      claimNudge$.next();
      await clock.tickAsync(0);
      expect(work).toHaveBeenCalledTimes(3);
      poller.stop();
      expect(clock.countTimers()).toBe(0);
    });

    test('waits for the previous in-flight claim when restarted', async () => {
      const { promise, resolve } = createResolvablePromise();
      const work = jest
        .fn(async () => true)
        .mockImplementationOnce(async () => {
          await promise;
          return true;
        });
      const claimNudge$ = new Subject<void>();
      const poller = createTaskPoller({
        initialPollInterval: 1000,
        logger: loggingSystemMock.createLogger(),
        pollInterval$: of(1000),
        claimNudge$,
        getCapacity: () => 1,
        work,
      });
      poller.start();
      await clock.tickAsync(0);
      claimNudge$.next();
      poller.stop();
      poller.start();
      await clock.tickAsync(0);
      expect(work).toHaveBeenCalledTimes(1);
      resolve(true);
      await clock.tickAsync(0);
      expect(work).toHaveBeenCalledTimes(2);
      await clock.tickAsync(1000);
      expect(work).toHaveBeenCalledTimes(3);
      poller.stop();
    });

    test('coalesces a claim nudge that arrives while a cycle is already running', async () => {
      const pollInterval = 1000;
      const { promise: worker, resolve: resolveWorker } = createResolvablePromise();

      const work = jest.fn(async () => {
        await worker;
        return true;
      });
      const claimNudge$ = new Subject<void>();
      createTaskPoller<void, boolean>({
        initialPollInterval: pollInterval,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(pollInterval),
        claimNudge$,
        getCapacity: () => 1,
        work,
      }).start();

      expect(work).toHaveBeenCalledTimes(1);
      await new Promise((resolve) => setImmediate(resolve));
      // fire the zero-delay timer that activates the claimNudge$ subscription
      clock.tick(0);
      await new Promise((resolve) => setImmediate(resolve));

      claimNudge$.next();
      await new Promise((resolve) => setImmediate(resolve));
      expect(work).toHaveBeenCalledTimes(1);

      resolveWorker(true);
      await new Promise((resolve) => setImmediate(resolve));

      // the coalesced nudge schedules the next cycle with 0 delay, not pollInterval
      clock.tick(0);
      await new Promise((resolve) => setImmediate(resolve));

      expect(work).toHaveBeenCalledTimes(2);
    });

    test('is a no-op once the poller has been stopped', async () => {
      const pollInterval = 1000;

      const work = jest.fn(async () => true);
      const claimNudge$ = new Subject<void>();
      const poller = createTaskPoller<void, boolean>({
        initialPollInterval: pollInterval,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(pollInterval),
        claimNudge$,
        getCapacity: () => 1,
        work,
      });
      poller.start();
      // Activate the deferred subscription so the nudge below has a subscriber.
      clock.tick(0);
      await new Promise((resolve) => setImmediate(resolve));
      expect(work).toHaveBeenCalledTimes(1);

      poller.stop();

      claimNudge$.next();
      await new Promise((resolve) => setImmediate(resolve));
      clock.tick(pollInterval);
      await new Promise((resolve) => setImmediate(resolve));

      expect(work).toHaveBeenCalledTimes(1);
    });

    test('releases its subscriptions when the poller is stopped', async () => {
      const claimNudge$ = new Subject<void>();
      const poller = createTaskPoller<void, boolean>({
        initialPollInterval: 1000,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(1000),
        claimNudge$,
        getCapacity: () => 1,
        work: jest.fn(async () => true),
      });

      poller.start();
      clock.tick(0);
      await new Promise((resolve) => setImmediate(resolve));
      expect(claimNudge$.observed).toBe(true);

      poller.stop();

      // A retained observer would keep the 500ms throttle timer alive after shutdown.
      expect(claimNudge$.observed).toBe(false);
    });

    test('resubscribes when a stopped poller is started again', async () => {
      const claimNudge$ = new Subject<void>();
      const work = jest.fn(async () => true);
      const poller = createTaskPoller<void, boolean>({
        initialPollInterval: 1000,
        logger: loggingSystemMock.create().get(),
        pollInterval$: of(1000),
        claimNudge$,
        getCapacity: () => 1,
        work,
      });

      poller.start();
      clock.tick(0);
      await new Promise((resolve) => setImmediate(resolve));
      poller.stop();

      poller.start();
      clock.tick(0);
      await new Promise((resolve) => setImmediate(resolve));
      const callsBeforeNudge = work.mock.calls.length;

      claimNudge$.next();
      await new Promise((resolve) => setImmediate(resolve));

      expect(work).toHaveBeenCalledTimes(callsBeforeNudge + 1);
    });
  });
});

function createResolvablePromise() {
  let resolve: (value: unknown) => void = () => {};
  const promise = new Promise((r) => {
    resolve = r;
  });
  // The "resolve = r;" code path is called before this
  return { promise, resolve };
}
