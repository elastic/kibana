/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { Option } from 'fp-ts/Option';
import type { Logger } from '@kbn/core/server';
import type { TaskErrorSource } from '../task_running';
import type { Result } from '../lib/result_type';
type WorkFn<H> = () => Promise<H>;
interface Opts<H> {
  logger: Logger;
  initialPollInterval: number;
  pollInterval$: Observable<number>;
  pollIntervalDelay$?: Observable<number>;
  getCapacity: () => number;
  work: WorkFn<H>;
}
export interface TaskPoller<T, H> {
  start: () => void;
  stop: () => void;
  events$: Observable<Result<H, PollingError<T>>>;
}
/**
 * constructs a new TaskPoller stream, which emits events on demand and on a scheduled interval, waiting for capacity to be available before emitting more events.
 *
 * @param opts
 * @prop {number} pollInterval - How often, in milliseconds, we will an event be emnitted, assuming there's capacity to do so
 * @prop {() => number} getCapacity - A function specifying whether there is capacity to emit new events
 * @prop {() => Promise<H>} work - The worker we wish to execute in order to `poll`
 *
 * @returns {Observable<Set<T>>} - An observable which emits an event whenever a polling event is due to take place, providing access to a singleton Set representing a queue
 *  of unique request argumets of type T.
 */
export declare function createTaskPoller<T, H>({
  logger,
  initialPollInterval,
  pollInterval$,
  pollIntervalDelay$,
  getCapacity,
  work,
}: Opts<H>): TaskPoller<T, H>;
export declare enum PollingErrorType {
  WorkError = 0,
  WorkTimeout = 1,
  RequestCapacityReached = 2,
  PollerError = 3,
}
export declare class PollingError<T> extends Error {
  readonly type: PollingErrorType;
  readonly data: Option<T>;
  readonly source: TaskErrorSource;
  constructor(message: string, type: PollingErrorType, data: Option<T>, cause?: Error);
}
export {};
