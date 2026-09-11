/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stats from 'stats-lite';
import type { Observable } from 'rxjs';
import { interval, merge, of } from 'rxjs';
import { filter, mergeScan, map, scan } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
import { CLAIM_STRATEGY_MGET, LOW_UTILIZATION_POLL_INTERVAL, MAX_CAPACITY } from '../config';
import { TaskCost } from '../task';
import { isClusterBlockException } from './errors';
import type { BackpressureReason } from './backpressure_reason';
import { getBackpressureReason } from './backpressure_reason';

const FLUSH_MARKER = Symbol('flush');
export const ADJUST_THROUGHPUT_INTERVAL = 10 * 1000;
export const PREFERRED_MAX_POLL_INTERVAL = 60 * 1000;
export const INTERVAL_AFTER_BLOCK_EXCEPTION = 61 * 1000;

// Error-free windows to hold backpressure before clearing. Must exceed the
// cluster-block poll cadence (INTERVAL_AFTER_BLOCK_EXCEPTION) so its sparse
// re-detections keep the signal armed instead of flapping.
export const BACKPRESSURE_HOLD_INTERVALS =
  Math.ceil(INTERVAL_AFTER_BLOCK_EXCEPTION / ADJUST_THROUGHPUT_INTERVAL) + 2;

// Capacity is measured in number of normal cost tasks that can be run
// At a minimum, we need to be able to run a single task with the greatest cost
// so we should convert the greatest cost to normal cost
export const MIN_COST = TaskCost.ExtraLarge / TaskCost.Normal;

// For default claim strategy
export const MIN_WORKERS = 1;

// When errors occur, reduce capacity by CAPACITY_DECREASE_PERCENTAGE
// When errors no longer occur, start increasing capacity by CAPACITY_INCREASE_PERCENTAGE
// until starting value is reached
const CAPACITY_DECREASE_PERCENTAGE = 0.8;
const CAPACITY_INCREASE_PERCENTAGE = 1.05;

// When errors occur, increase pollInterval by POLL_INTERVAL_INCREASE_PERCENTAGE
// When errors no longer occur, start decreasing pollInterval by POLL_INTERVAL_DECREASE_PERCENTAGE
// until starting value is reached
const POLL_INTERVAL_DECREASE_PERCENTAGE = 0.95;
const POLL_INTERVAL_INCREASE_PERCENTAGE = 1.2;

interface ErrorScanResult {
  count: number;
  isBlockException: boolean;
  reason: BackpressureReason | null;
}

/**
 * Whether Task Manager is applying Elasticsearch-driven backpressure. Capacity
 * drops below baseline only on ES-pressure errors, and only the cluster-block
 * branch produces the poll-interval sentinel (normal backoff caps at 60s). The
 * low-utilization poll-interval change and pool saturation are excluded so this
 * stays distinct from capacity-driven delay.
 */
export function isBackpressureActive(
  currentCapacity: number,
  startingCapacity: number,
  currentPollInterval: number
): boolean {
  return (
    currentCapacity < startingCapacity || currentPollInterval === INTERVAL_AFTER_BLOCK_EXCEPTION
  );
}

export function createCapacityScan(
  config: TaskManagerConfig,
  logger: Logger,
  startingCapacity: number
) {
  return scan(
    (previousCapacity: number, { count: errorCount, isBlockException }: ErrorScanResult) => {
      let newCapacity: number;
      if (isBlockException) {
        newCapacity = previousCapacity;
      } else {
        if (errorCount > 0) {
          const minCapacity = getMinCapacity(config);
          // Decrease capacity by CAPACITY_DECREASE_PERCENTAGE while making sure it doesn't go lower than minCapacity.
          // Using Math.floor to make sure the number is different than previous while not being a decimal value.
          newCapacity = Math.max(
            Math.floor(previousCapacity * CAPACITY_DECREASE_PERCENTAGE),
            minCapacity
          );
        } else {
          // Increase capacity by CAPACITY_INCREASE_PERCENTAGE while making sure it doesn't go
          // higher than the starting value. Using Math.ceil to make sure the number is different than
          // previous while not being a decimal value
          newCapacity = Math.min(
            startingCapacity,
            Math.ceil(previousCapacity * CAPACITY_INCREASE_PERCENTAGE)
          );
        }
      }

      if (newCapacity !== previousCapacity) {
        logger.debug(
          `Capacity configuration changing from ${previousCapacity} to ${newCapacity} after seeing ${errorCount} "too many request" and/or "execute [inline] script" error(s)`
        );
        if (previousCapacity === startingCapacity) {
          logger.warn(
            `Capacity configuration is temporarily reduced after Elasticsearch returned ${errorCount} "too many request" and/or "execute [inline] script" error(s).`
          );
        }
      }
      return newCapacity;
    },
    startingCapacity
  );
}

export function createPollIntervalScan(
  logger: Logger,
  startingPollInterval: number,
  claimStrategy: string,
  tmUtilizationQueue: (value?: number | undefined) => number[]
) {
  return scan(
    (
      previousPollInterval: number,
      [{ count: errorCount, isBlockException }, tmUtilization]: [ErrorScanResult, number]
    ) => {
      let newPollInterval: number;
      let updatedForCapacity = false;
      let avgTmUtilization = 0;
      if (isBlockException) {
        newPollInterval = INTERVAL_AFTER_BLOCK_EXCEPTION;
      } else {
        if (errorCount > 0) {
          // Increase poll interval by POLL_INTERVAL_INCREASE_PERCENTAGE and use Math.ceil to
          // make sure the number is different than previous while not being a decimal value.
          // Also ensure we don't go over PREFERRED_MAX_POLL_INTERVAL or startingPollInterval,
          // whichever is greater.
          newPollInterval = Math.min(
            Math.ceil(previousPollInterval * POLL_INTERVAL_INCREASE_PERCENTAGE),
            Math.ceil(Math.max(PREFERRED_MAX_POLL_INTERVAL, startingPollInterval))
          );
          if (!Number.isSafeInteger(newPollInterval) || newPollInterval < 0) {
            logger.error(
              `Poll interval configuration had an issue calculating the new poll interval: Math.min(Math.ceil(${previousPollInterval} * ${POLL_INTERVAL_INCREASE_PERCENTAGE}), Math.max(${PREFERRED_MAX_POLL_INTERVAL}, ${startingPollInterval})) = ${newPollInterval}, will keep the poll interval unchanged (${previousPollInterval})`
            );
            newPollInterval = previousPollInterval;
          }
        } else {
          if (previousPollInterval === INTERVAL_AFTER_BLOCK_EXCEPTION) {
            newPollInterval = startingPollInterval;
          } else {
            // Decrease poll interval by POLL_INTERVAL_DECREASE_PERCENTAGE and use Math.floor to
            // make sure the number is different than previous while not being a decimal value.
            newPollInterval = Math.max(
              startingPollInterval,
              Math.floor(previousPollInterval * POLL_INTERVAL_DECREASE_PERCENTAGE)
            );
          }

          if (!Number.isSafeInteger(newPollInterval) || newPollInterval < 0) {
            logger.error(
              `Poll interval configuration had an issue calculating the new poll interval: Math.max(${startingPollInterval}, Math.floor(${previousPollInterval} * ${POLL_INTERVAL_DECREASE_PERCENTAGE})) = ${newPollInterval}, will keep the poll interval unchanged (${previousPollInterval})`
            );
            newPollInterval = previousPollInterval;
          }

          // If the task claim strategy is mget, increase the poll interval if the the avg used capacity over 15s is less than 25%.
          const queue = tmUtilizationQueue(tmUtilization);
          avgTmUtilization = stats.mean(queue);
          if (
            claimStrategy === CLAIM_STRATEGY_MGET &&
            newPollInterval < LOW_UTILIZATION_POLL_INTERVAL
          ) {
            updatedForCapacity = true;
            if (avgTmUtilization < 25) {
              newPollInterval = LOW_UTILIZATION_POLL_INTERVAL;
            } else {
              // If the the used capacity is greater than or equal to 25% reset the polling interval.
              newPollInterval = startingPollInterval;
            }
          }
        }
      }
      if (newPollInterval !== previousPollInterval) {
        if (previousPollInterval !== INTERVAL_AFTER_BLOCK_EXCEPTION) {
          if (updatedForCapacity) {
            logger.debug(
              `Poll interval configuration changing from ${previousPollInterval} to ${newPollInterval} after a change in the average task load: ${avgTmUtilization}.`
            );
          } else {
            logger.warn(
              `Poll interval configuration changing from ${previousPollInterval} to ${newPollInterval} after seeing ${errorCount} "too many request" and/or "execute [inline] script" error(s) and/or "cluster_block_exception" error(s).`
            );
          }
        }
      }
      return newPollInterval;
    },
    startingPollInterval
  );
}

export function countErrors(
  errors$: Observable<Error>,
  countInterval: number
): Observable<ErrorScanResult> {
  return merge(
    // Flush error count at fixed interval
    interval(countInterval).pipe(map(() => FLUSH_MARKER)),
    // Only errors Task Manager backs off on; classifier is shared with `reason`.
    errors$.pipe(filter((e) => getBackpressureReason(e) !== null))
  ).pipe(
    // When tag is "flush", reset the error counter
    // Otherwise increment the error counter
    mergeScan(({ count, isBlockException, reason }, next) => {
      if (next === FLUSH_MARKER) {
        return of(emitErrorCount(count, isBlockException, reason), resetErrorCount());
      }
      const error = next as Error;
      return of(
        incrementOrEmitErrorCount(
          count,
          isClusterBlockException(error),
          getBackpressureReason(error)
        )
      );
    }, emitErrorCount(0, false, null)),
    filter(isEmitEvent),
    map(({ count, isBlockException, reason }) => {
      return { count, isBlockException, reason };
    })
  );
}

function emitErrorCount(
  count: number,
  isBlockException: boolean,
  reason: BackpressureReason | null
) {
  return {
    tag: 'emit',
    isBlockException,
    count,
    reason,
  };
}

function isEmitEvent(event: {
  tag: string;
  count: number;
  isBlockException: boolean;
  reason: BackpressureReason | null;
}) {
  return event.tag === 'emit';
}

function incrementOrEmitErrorCount(
  count: number,
  isBlockException: boolean,
  reason: BackpressureReason | null
) {
  if (isBlockException) {
    return {
      tag: 'emit',
      isBlockException,
      count: count + 1,
      reason,
    };
  }
  return {
    tag: 'inc',
    isBlockException,
    count: count + 1,
    reason,
  };
}

function resetErrorCount() {
  return {
    tag: 'initial',
    isBlockException: false,
    count: 0,
    reason: null,
  };
}

function getMinCapacity(config: TaskManagerConfig) {
  switch (config.claim_strategy) {
    case CLAIM_STRATEGY_MGET:
      return MIN_COST;

    default:
      return MIN_WORKERS;
  }
}

export function calculateStartingCapacity(
  config: TaskManagerConfig,
  logger: Logger,
  defaultCapacity: number
): number {
  if (config.capacity !== undefined && config.max_workers !== undefined) {
    logger.warn(
      `Both "xpack.task_manager.capacity" and "xpack.task_manager.max_workers" configs are set, max_workers will be ignored in favor of capacity and the setting should be removed.`
    );
  }

  if (config.capacity) {
    // Use capacity if explicitly set
    return config.capacity!;
  } else if (config.max_workers) {
    // Otherwise use max_worker value as capacity, capped at MAX_CAPACITY
    return Math.min(config.max_workers, MAX_CAPACITY);
  }

  // Neither are set, use the given default capacity
  return defaultCapacity;
}
