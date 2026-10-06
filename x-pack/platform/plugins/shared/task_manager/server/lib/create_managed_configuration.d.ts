/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
import type { BackpressureReason } from './backpressure_reason';
export declare const ADJUST_THROUGHPUT_INTERVAL: number;
export declare const PREFERRED_MAX_POLL_INTERVAL: number;
export declare const INTERVAL_AFTER_BLOCK_EXCEPTION: number;
export declare const BACKPRESSURE_HOLD_INTERVALS: number;
export declare const MIN_COST: number;
export declare const MIN_WORKERS = 1;
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
export declare function isBackpressureActive(
  currentCapacity: number,
  startingCapacity: number,
  currentPollInterval: number
): boolean;
export declare function createCapacityScan(
  config: TaskManagerConfig,
  logger: Logger,
  startingCapacity: number
): import('rxjs').OperatorFunction<ErrorScanResult, number>;
export declare function createPollIntervalScan(
  logger: Logger,
  startingPollInterval: number,
  claimStrategy: string,
  tmUtilizationQueue: (value?: number | undefined) => number[]
): import('rxjs').OperatorFunction<[ErrorScanResult, number], number>;
export declare function countErrors(
  errors$: Observable<Error>,
  countInterval: number
): Observable<ErrorScanResult>;
export declare function calculateStartingCapacity(
  config: TaskManagerConfig,
  logger: Logger,
  defaultCapacity: number
): number;
export {};
