/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject, startWith, distinctUntilChanged, BehaviorSubject, withLatestFrom } from 'rxjs';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  ADJUST_THROUGHPUT_INTERVAL,
  INTERVAL_AFTER_BLOCK_EXCEPTION,
  calculateStartingCapacity,
  countErrors,
  createCapacityScan,
  createPollIntervalScan,
  isBackpressureActive,
} from './create_managed_configuration';
import { mockLogger } from '../test_utils';
import type { TaskManagerConfig } from '../config';
import {
  CLAIM_STRATEGY_MGET,
  DEFAULT_CAPACITY,
  LOW_UTILIZATION_POLL_INTERVAL,
  MGET_DEFAULT_POLL_INTERVAL,
} from '../config';
import { BulkUpdateError, MsearchError } from './errors';
import { createRunningAveragedStat } from '../monitoring/task_run_calculators';

describe('createManagedConfiguration()', () => {
  const logger = mockLogger();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => jest.useRealTimers());

  test('uses max_workers config as capacity if only max workers is defined', async () => {
    const capacity = calculateStartingCapacity(
      {
        max_workers: 10,
        poll_interval: 2,
      } as TaskManagerConfig,
      logger,
      DEFAULT_CAPACITY
    );
    expect(capacity).toBe(10);
  });

  test('uses max_workers config as capacity but does not exceed MAX_CAPACITY', async () => {
    const capacity = calculateStartingCapacity(
      {
        max_workers: 1000,
        poll_interval: 2,
      } as TaskManagerConfig,
      logger,
      DEFAULT_CAPACITY
    );
    expect(capacity).toBe(50);
  });

  test('uses provided defaultCapacity if neither capacity nor max_workers is defined', async () => {
    const capacity = calculateStartingCapacity(
      {
        poll_interval: 2,
      } as TaskManagerConfig,
      logger,
      500
    );
    expect(capacity).toBe(500);
  });

  test('logs warning and uses capacity config if both capacity and max_workers is defined', async () => {
    const capacity = calculateStartingCapacity(
      {
        capacity: 30,
        max_workers: 10,
        poll_interval: 2,
      } as TaskManagerConfig,
      logger,
      500
    );
    expect(capacity).toBe(30);
    expect(logger.warn).toHaveBeenCalledWith(
      `Both \"xpack.task_manager.capacity\" and \"xpack.task_manager.max_workers\" configs are set, max_workers will be ignored in favor of capacity and the setting should be removed.`
    );
  });

  test(`skips errors that aren't about too many requests`, async () => {
    const errorSubscription = jest.fn();
    const errors$ = new Subject<Error>();
    const errorCheck$ = countErrors(errors$, ADJUST_THROUGHPUT_INTERVAL);
    errorCheck$.subscribe(errorSubscription);

    errors$.next(new Error('foo'));
    jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL);
    expect(errorSubscription).toHaveBeenCalledTimes(1);
  });

  describe('capacity configuration', () => {
    function setupScenario(startingCapacity: number, claimStrategy: string = CLAIM_STRATEGY_MGET) {
      const errors$ = new Subject<Error>();
      const errorCheck$ = countErrors(errors$, ADJUST_THROUGHPUT_INTERVAL);
      const subscription = jest.fn();
      const capacityConfiguration$ = errorCheck$.pipe(
        createCapacityScan(
          {
            capacity: startingCapacity,
            poll_interval: 1,
            claim_strategy: claimStrategy,
          } as TaskManagerConfig,
          logger,
          startingCapacity
        ),
        startWith(startingCapacity),
        distinctUntilChanged()
      );
      capacityConfiguration$.subscribe(subscription);
      return { subscription, errors$ };
    }

    describe('mget claim strategy', () => {
      test('should not decrease configuration at the next interval when an error without status code is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new Error());
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
      });

      test('should decrease configuration at the next interval when an msearch 429 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(429));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when an msearch 500 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(500));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when an msearch 503 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(503));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a bulkPartialUpdate 429 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(
          new BulkUpdateError({ statusCode: 429, message: 'test', type: 'too_many_requests' })
        );
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a bulkPartialUpdate 500 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(
          new BulkUpdateError({ statusCode: 500, message: 'test', type: 'server_error' })
        );
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when an msearch 502 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(502));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a bulkPartialUpdate 503 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(
          new BulkUpdateError({ statusCode: 503, message: 'test', type: 'unavailable' })
        );
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when an msearch 504 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(504));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should not change configuration at the next interval when other msearch error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(404));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(1);
      });

      test('should log a warning when the configuration changes from the starting value', async () => {
        const { errors$ } = setupScenario(10, CLAIM_STRATEGY_MGET);
        errors$.next(new MsearchError(429));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.warn).toHaveBeenCalledWith(
          'Capacity configuration is temporarily reduced after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
        );
      });

      test('should increase configuration back to normal incrementally after an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10, CLAIM_STRATEGY_MGET);
        errors$.next(new MsearchError(429));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL * 10);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
        expect(subscription).toHaveBeenNthCalledWith(3, 9);
        expect(subscription).toHaveBeenNthCalledWith(4, 10);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(4);
      });

      test('should keep reducing configuration when errors keep emitting until it reaches minimum', async () => {
        const { subscription, errors$ } = setupScenario(10, CLAIM_STRATEGY_MGET);
        for (let i = 0; i < 20; i++) {
          errors$.next(new MsearchError(429));
          jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL);
        }
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
        expect(subscription).toHaveBeenNthCalledWith(3, 6);
        expect(subscription).toHaveBeenNthCalledWith(4, 5);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(4);
      });
    });
  });

  describe('pollInterval configuration', () => {
    function setupScenario(
      startingPollInterval: number,
      claimStrategy: string = CLAIM_STRATEGY_MGET
    ) {
      const errors$ = new Subject<Error>();
      const utilization$ = new BehaviorSubject<number>(100);
      const errorCheck$ = countErrors(errors$, ADJUST_THROUGHPUT_INTERVAL);
      const subscription = jest.fn();
      const queue = createRunningAveragedStat<number>(5);
      const pollIntervalConfiguration$ = errorCheck$.pipe(
        withLatestFrom(utilization$),
        createPollIntervalScan(logger, startingPollInterval, claimStrategy, queue),
        startWith(startingPollInterval),
        distinctUntilChanged()
      );
      pollIntervalConfiguration$.subscribe(subscription);
      return { subscription, errors$, utilization$ };
    }

    describe('mget claim strategy', () => {
      test('should increase configuration at the next interval when an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(100, CLAIM_STRATEGY_MGET);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        jest.advanceTimersByTime(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 120);
      });

      test('should log a warning when the configuration changes from the starting value', async () => {
        const { errors$ } = setupScenario(100, CLAIM_STRATEGY_MGET);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.warn).toHaveBeenCalledWith(
          'Poll interval configuration changing from 100 to 120 after seeing 1 "too many request" and/or "execute [inline] script" error(s) and/or "cluster_block_exception" error(s).'
        );
      });

      test('should decrease configuration back to normal incrementally after an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(
          MGET_DEFAULT_POLL_INTERVAL,
          CLAIM_STRATEGY_MGET
        );
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL * 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 600);
        expect(subscription).toHaveBeenNthCalledWith(3, 500);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(3);
      });

      test('should decrease configuration after error and reset to initial poll interval when poll interval < default and TM utilization > 25%', async () => {
        const { subscription, errors$ } = setupScenario(
          MGET_DEFAULT_POLL_INTERVAL - 100,
          CLAIM_STRATEGY_MGET
        );
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL * 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 480);
        expect(subscription).toHaveBeenNthCalledWith(3, 400);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(3);
      });

      test('should decrease configuration after error and reset to low utilization poll interval when poll interval < default and TM utilization < 25%', async () => {
        const { subscription, errors$, utilization$ } = setupScenario(
          MGET_DEFAULT_POLL_INTERVAL - 20,
          CLAIM_STRATEGY_MGET
        );
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        for (let i = 0; i < 10; i++) {
          utilization$.next(20);
          jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL);
        }
        expect(subscription).toHaveBeenNthCalledWith(2, 576);
        expect(subscription).toHaveBeenNthCalledWith(3, 3000);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(3);
      });

      test('should change configuration based on TM utilization', async () => {
        const { subscription, utilization$ } = setupScenario(500, CLAIM_STRATEGY_MGET);
        const u = [15, 35, 5, 48, 0];
        for (let i = 0; i < u.length; i++) {
          utilization$.next(u[i]);
          jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL);
        }
        expect(subscription).toHaveBeenNthCalledWith(2, 3000);
        expect(subscription).toHaveBeenNthCalledWith(3, 500);
        expect(subscription).toHaveBeenNthCalledWith(4, 3000);
        expect(subscription).toHaveBeenNthCalledWith(5, 500);
        expect(subscription).toHaveBeenNthCalledWith(6, 3000);
        expect(subscription).toHaveBeenCalledTimes(6);
      });

      test('should log a warning when the configuration changes from the starting value based on TM utilization', async () => {
        const { utilization$ } = setupScenario(100, CLAIM_STRATEGY_MGET);
        utilization$.next(20);
        jest.advanceTimersByTime(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.debug).toHaveBeenCalledWith(
          'Poll interval configuration changing from 100 to 3000 after a change in the average task load: 20.'
        );
      });
    });
  });
});

describe('isBackpressureActive()', () => {
  const startingCapacity = 10;
  const startingPollInterval = MGET_DEFAULT_POLL_INTERVAL;

  test('is inactive at baseline capacity and poll interval', () => {
    expect(isBackpressureActive(startingCapacity, startingCapacity, startingPollInterval)).toBe(
      false
    );
  });

  test('is active when capacity is reduced below baseline (ES 429 / script errors)', () => {
    // 429 reproduction: capacity 10 -> 8, poll interval 500 -> 600
    expect(isBackpressureActive(8, startingCapacity, 600)).toBe(true);
  });

  test('is active on a cluster_block_exception (poll interval sentinel, capacity held)', () => {
    // cluster_block reproduction: capacity held at baseline, poll interval -> 61s
    expect(
      isBackpressureActive(startingCapacity, startingCapacity, INTERVAL_AFTER_BLOCK_EXCEPTION)
    ).toBe(true);
  });

  test('stays inactive on the low-utilization poll-interval change (capacity-driven, not ES)', () => {
    expect(
      isBackpressureActive(startingCapacity, startingCapacity, LOW_UTILIZATION_POLL_INTERVAL)
    ).toBe(false);
  });

  test('stays inactive under pool saturation with no ES errors', () => {
    // Pool saturation does not reduce capacity nor error-raise the poll interval.
    expect(isBackpressureActive(startingCapacity, startingCapacity, startingPollInterval)).toBe(
      false
    );
  });
});
