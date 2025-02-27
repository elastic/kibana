/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { Subject, startWith, distinctUntilChanged, BehaviorSubject, withLatestFrom } from 'rxjs';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  ADJUST_THROUGHPUT_INTERVAL,
  calculateStartingCapacity,
  countErrors,
  createCapacityScan,
  createPollIntervalScan,
  INTERVAL_AFTER_BLOCK_EXCEPTION,
} from './create_managed_configuration';
import { mockLogger } from '../test_utils';
import {
  CLAIM_STRATEGY_UPDATE_BY_QUERY,
  CLAIM_STRATEGY_MGET,
  TaskManagerConfig,
  DEFAULT_CAPACITY,
  DEFAULT_POLL_INTERVAL,
} from '../config';
import { MsearchError } from './msearch_error';
import { BulkUpdateError } from './bulk_update_error';
import { createRunningAveragedStat } from '../monitoring/task_run_calculators';

describe('createManagedConfiguration()', () => {
  let clock: sinon.SinonFakeTimers;
  const logger = mockLogger();

  beforeEach(() => {
    jest.resetAllMocks();
    clock = sinon.useFakeTimers();
  });

  afterEach(() => clock.restore());

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
    clock.tick(ADJUST_THROUGHPUT_INTERVAL);
    expect(errorSubscription).toHaveBeenCalledTimes(1);
  });

  describe('capacity configuration', () => {
    function setupScenario(
      startingCapacity: number,
      claimStrategy: string = CLAIM_STRATEGY_UPDATE_BY_QUERY
    ) {
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

    beforeEach(() => {
      jest.resetAllMocks();
      clock = sinon.useFakeTimers();
    });

    afterEach(() => clock.restore());

    describe('default claim strategy', () => {
      test('should decrease configuration at the next interval when an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a 500 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(SavedObjectsErrorHelpers.decorateGeneralError(new Error('a'), 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a 503 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should log a warning when the configuration changes from the starting value', async () => {
        const { errors$ } = setupScenario(10);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.warn).toHaveBeenCalledWith(
          'Capacity configuration is temporarily reduced after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
        );
      });

      test('should increase configuration back to normal incrementally after an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL * 10);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
        expect(subscription).toHaveBeenNthCalledWith(3, 9);
        expect(subscription).toHaveBeenNthCalledWith(4, 10);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(4);
      });

      test('should keep reducing configuration when errors keep emitting until it reaches minimum', async () => {
        const { subscription, errors$ } = setupScenario(10);
        for (let i = 0; i < 20; i++) {
          errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
          clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        }
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
        expect(subscription).toHaveBeenNthCalledWith(3, 6);
        expect(subscription).toHaveBeenNthCalledWith(4, 4);
        expect(subscription).toHaveBeenNthCalledWith(5, 3);
        expect(subscription).toHaveBeenNthCalledWith(6, 2);
        expect(subscription).toHaveBeenNthCalledWith(7, 1);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(7);
      });
    });

    describe('mget claim strategy', () => {
      test('should not decrease configuration at the next interval when an error without status code is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new Error());
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
      });

      test('should decrease configuration at the next interval when an msearch 429 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(429));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when an msearch 500 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(500));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when an msearch 503 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(503));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a bulkPartialUpdate 429 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(
          new BulkUpdateError({ statusCode: 429, message: 'test', type: 'too_many_requests' })
        );
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a bulkPartialUpdate 500 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(
          new BulkUpdateError({ statusCode: 500, message: 'test', type: 'server_error' })
        );
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when an msearch 502 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(502));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when a bulkPartialUpdate 503 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(
          new BulkUpdateError({ statusCode: 503, message: 'test', type: 'unavailable' })
        );
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should decrease configuration at the next interval when an msearch 504 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(504));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 8);
      });

      test('should not change configuration at the next interval when other msearch error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10);
        errors$.next(new MsearchError(404));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 10);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(1);
      });

      test('should log a warning when the configuration changes from the starting value', async () => {
        const { errors$ } = setupScenario(10, CLAIM_STRATEGY_MGET);
        errors$.next(new MsearchError(429));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.warn).toHaveBeenCalledWith(
          'Capacity configuration is temporarily reduced after Elasticsearch returned 1 "too many request" and/or "execute [inline] script" error(s).'
        );
      });

      test('should increase configuration back to normal incrementally after an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(10, CLAIM_STRATEGY_MGET);
        errors$.next(new MsearchError(429));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL * 10);
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
          clock.tick(ADJUST_THROUGHPUT_INTERVAL);
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
      claimStrategy: string = CLAIM_STRATEGY_UPDATE_BY_QUERY
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

    beforeEach(() => {
      jest.resetAllMocks();
      clock = sinon.useFakeTimers();
    });

    afterEach(() => clock.restore());

    describe('default claim strategy', () => {
      test('should increase configuration at the next interval when an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(100);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 120);
      });

      test('should increase configuration at the next interval when a 500 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(100);
        errors$.next(SavedObjectsErrorHelpers.decorateGeneralError(new Error('a'), 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 120);
      });

      test('should increase configuration at the next interval when a 503 error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(100);
        errors$.next(SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 120);
      });

      test('should increase configuration at the next interval when an error with cluster_block_exception type is emitted, then decreases back to normal', async () => {
        const { subscription, errors$ } = setupScenario(100);
        errors$.next(
          new BulkUpdateError({
            statusCode: 403,
            message: 'index is blocked',
            type: 'cluster_block_exception',
          })
        );
        expect(subscription).toHaveBeenNthCalledWith(1, 100);
        // It emits the error with cluster_block_exception type immediately
        expect(subscription).toHaveBeenNthCalledWith(2, INTERVAL_AFTER_BLOCK_EXCEPTION);
        clock.tick(INTERVAL_AFTER_BLOCK_EXCEPTION);
        expect(subscription).toHaveBeenCalledTimes(3);
        expect(subscription).toHaveBeenNthCalledWith(3, 100);
      });

      test('should log a warning when the configuration changes from the starting value', async () => {
        const { errors$ } = setupScenario(100);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.warn).toHaveBeenCalledWith(
          'Poll interval configuration changing from 100 to 120 after seeing 1 "too many request" and/or "execute [inline] script" error(s) and/or "cluster_block_exception" error(s).'
        );
      });

      test('should log a warning when an issue occurred in the calculating of the increased poll interval', async () => {
        const { errors$ } = setupScenario(NaN);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.error).toHaveBeenCalledWith(
          'Poll interval configuration had an issue calculating the new poll interval: Math.min(Math.ceil(NaN * 1.2), Math.max(60000, NaN)) = NaN, will keep the poll interval unchanged (NaN)'
        );
      });

      test('should log a warning when an issue occurred in the calculating of the decreased poll interval', async () => {
        setupScenario(NaN);
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.error).toHaveBeenCalledWith(
          'Poll interval configuration had an issue calculating the new poll interval: Math.max(NaN, Math.floor(NaN * 0.95)) = NaN, will keep the poll interval unchanged (NaN)'
        );
      });

      test('should decrease configuration back to normal incrementally after an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(100);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL * 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 120);
        expect(subscription).toHaveBeenNthCalledWith(3, 114);
        // 108.3 -> 108 from Math.floor
        expect(subscription).toHaveBeenNthCalledWith(4, 108);
        expect(subscription).toHaveBeenNthCalledWith(5, 102);
        // 96.9 -> 100 from Math.max with the starting value
        expect(subscription).toHaveBeenNthCalledWith(6, 100);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(6);
      });

      test('should increase configuration when errors keep emitting', async () => {
        const { subscription, errors$ } = setupScenario(100);
        for (let i = 0; i < 3; i++) {
          errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
          clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        }
        expect(subscription).toHaveBeenNthCalledWith(2, 120);
        expect(subscription).toHaveBeenNthCalledWith(3, 144);
        // 172.8 -> 173 from Math.ceil
        expect(subscription).toHaveBeenNthCalledWith(4, 173);
      });

      test('should limit the upper bound to 60s by default', async () => {
        const { subscription, errors$ } = setupScenario(3000);
        for (let i = 0; i < 18; i++) {
          errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
          clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        }
        expect(subscription).toHaveBeenNthCalledWith(2, 3600);
        expect(subscription).toHaveBeenNthCalledWith(3, 4320);
        expect(subscription).toHaveBeenNthCalledWith(4, 5184);
        expect(subscription).toHaveBeenNthCalledWith(5, 6221);
        expect(subscription).toHaveBeenNthCalledWith(6, 7466);
        expect(subscription).toHaveBeenNthCalledWith(7, 8960);
        expect(subscription).toHaveBeenNthCalledWith(8, 10752);
        expect(subscription).toHaveBeenNthCalledWith(9, 12903);
        expect(subscription).toHaveBeenNthCalledWith(10, 15484);
        expect(subscription).toHaveBeenNthCalledWith(11, 18581);
        expect(subscription).toHaveBeenNthCalledWith(12, 22298);
        expect(subscription).toHaveBeenNthCalledWith(13, 26758);
        expect(subscription).toHaveBeenNthCalledWith(14, 32110);
        expect(subscription).toHaveBeenNthCalledWith(15, 38532);
        expect(subscription).toHaveBeenNthCalledWith(16, 46239);
        expect(subscription).toHaveBeenNthCalledWith(17, 55487);
        expect(subscription).toHaveBeenNthCalledWith(18, 60000);
      });

      test('should not adjust poll interval dynamically if initial value is > 60s', async () => {
        const { subscription, errors$ } = setupScenario(65000);
        for (let i = 0; i < 5; i++) {
          errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
          clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        }
        expect(subscription).toHaveBeenCalledTimes(1);
        expect(subscription).toHaveBeenNthCalledWith(1, 65000);
      });
    });

    describe('mget claim strategy', () => {
      test('should increase configuration at the next interval when an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(100, CLAIM_STRATEGY_MGET);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL - 1);
        expect(subscription).toHaveBeenCalledTimes(1);
        clock.tick(1);
        expect(subscription).toHaveBeenCalledTimes(2);
        expect(subscription).toHaveBeenNthCalledWith(2, 120);
      });

      test('should log a warning when the configuration changes from the starting value', async () => {
        const { errors$ } = setupScenario(100, CLAIM_STRATEGY_MGET);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.warn).toHaveBeenCalledWith(
          'Poll interval configuration changing from 100 to 120 after seeing 1 "too many request" and/or "execute [inline] script" error(s) and/or "cluster_block_exception" error(s).'
        );
      });

      test('should decrease configuration back to normal incrementally after an error is emitted', async () => {
        const { subscription, errors$ } = setupScenario(DEFAULT_POLL_INTERVAL, CLAIM_STRATEGY_MGET);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL * 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 3600);
        expect(subscription).toHaveBeenNthCalledWith(3, 3420);
        expect(subscription).toHaveBeenNthCalledWith(4, 3249);
        expect(subscription).toHaveBeenNthCalledWith(5, 3086);
        expect(subscription).toHaveBeenNthCalledWith(6, 3000);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(6);
      });

      test('should decrease configuration after error and reset to initial poll interval when poll interval < default and TM utilization > 25%', async () => {
        const { subscription, errors$ } = setupScenario(2800, CLAIM_STRATEGY_MGET);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        clock.tick(ADJUST_THROUGHPUT_INTERVAL * 10);
        expect(subscription).toHaveBeenNthCalledWith(2, 3360);
        expect(subscription).toHaveBeenNthCalledWith(3, 3192);
        expect(subscription).toHaveBeenNthCalledWith(4, 3032);
        expect(subscription).toHaveBeenNthCalledWith(5, 2800);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(5);
      });

      test('should decrease configuration after error and reset to default poll interval when poll interval < default and TM utilization < 25%', async () => {
        const { subscription, errors$, utilization$ } = setupScenario(2800, CLAIM_STRATEGY_MGET);
        errors$.next(SavedObjectsErrorHelpers.createTooManyRequestsError('a', 'b'));
        for (let i = 0; i < 10; i++) {
          utilization$.next(20);
          clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        }
        expect(subscription).toHaveBeenNthCalledWith(2, 3360);
        expect(subscription).toHaveBeenNthCalledWith(3, 3192);
        expect(subscription).toHaveBeenNthCalledWith(4, 3032);
        expect(subscription).toHaveBeenNthCalledWith(5, 3000);
        // No new calls due to value not changing and usage of distinctUntilChanged()
        expect(subscription).toHaveBeenCalledTimes(5);
      });

      test('should change configuration based on TM utilization', async () => {
        const { subscription, utilization$ } = setupScenario(500, CLAIM_STRATEGY_MGET);
        const u = [15, 35, 5, 48, 0];
        for (let i = 0; i < u.length; i++) {
          utilization$.next(u[i]);
          clock.tick(ADJUST_THROUGHPUT_INTERVAL);
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
        clock.tick(ADJUST_THROUGHPUT_INTERVAL);
        expect(logger.debug).toHaveBeenCalledWith(
          'Poll interval configuration changing from 100 to 3000 after a change in the average task load: 20.'
        );
      });
    });
  });
});
