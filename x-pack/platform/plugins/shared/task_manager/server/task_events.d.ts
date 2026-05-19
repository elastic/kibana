/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConcreteTaskInstance } from './task';
import type { Result, Err } from './lib/result_type';
import type { ClaimAndFillPoolResult } from './lib/fill_pool';
import type { PollingError } from './polling';
import type { DecoratedError, TaskRunResult } from './task_running';
import type { EventLoopDelayConfig } from './config';
import type { TaskManagerMetrics } from './metrics/task_metrics_collector';
export declare enum TaskPersistence {
  Recurring = 'recurring',
  NonRecurring = 'non_recurring',
}
export declare enum TaskEventType {
  TASK_CLAIM = 'TASK_CLAIM',
  TASK_MARK_RUNNING = 'TASK_MARK_RUNNING',
  TASK_RUN = 'TASK_RUN',
  TASK_RUN_REQUEST = 'TASK_RUN_REQUEST',
  TASK_POLLING_CYCLE = 'TASK_POLLING_CYCLE',
  TASK_MANAGER_METRIC = 'TASK_MANAGER_METRIC',
  TASK_MANAGER_STAT = 'TASK_MANAGER_STAT',
}
export interface TaskTiming {
  start: number;
  stop: number;
  eventLoopBlockMs?: number;
}
export type WithTaskTiming<T> = T & {
  timing: TaskTiming;
};
export declare function startTaskTimer(): () => TaskTiming;
export declare function startTaskTimerWithEventLoopMonitoring(
  eventLoopDelayConfig: EventLoopDelayConfig
): () => TaskTiming;
export interface TaskEvent<OkResult, ErrorResult, ID = string> {
  id?: ID;
  timing?: TaskTiming;
  type: TaskEventType;
  event: Result<OkResult, ErrorResult>;
}
export interface RanTask {
  task: ConcreteTaskInstance;
  persistence: TaskPersistence;
  result: TaskRunResult;
  isExpired: boolean;
}
export type ErroredTask = RanTask & {
  error: DecoratedError;
};
export type TaskMarkRunning = TaskEvent<ConcreteTaskInstance, Error>;
export type TaskRun = TaskEvent<RanTask, ErroredTask>;
export type TaskClaim = TaskEvent<ConcreteTaskInstance, Error>;
export type TaskRunRequest = TaskEvent<ConcreteTaskInstance, Error>;
export type TaskPollingCycle<T = string> = TaskEvent<ClaimAndFillPoolResult, PollingError<T>>;
export type TaskManagerMetric = TaskEvent<TaskManagerMetrics, Error>;
export type TaskManagerStats =
  | 'load'
  | 'pollingDelay'
  | 'claimDuration'
  | 'workerUtilization'
  | 'runDelay';
export type TaskManagerStat = TaskEvent<number, never, TaskManagerStats>;
export type OkResultOf<EventType> = EventType extends TaskEvent<infer OkResult, infer ErrorResult>
  ? OkResult
  : never;
export type ErrResultOf<EventType> = EventType extends TaskEvent<infer OkResult, infer ErrorResult>
  ? ErrorResult
  : never;
export declare function asTaskMarkRunningEvent(
  id: string,
  event: Result<ConcreteTaskInstance, Error>,
  timing?: TaskTiming
): TaskMarkRunning;
export declare function asTaskRunEvent(
  id: string,
  event: Result<RanTask, ErroredTask>,
  timing?: TaskTiming
): TaskRun;
export declare function asTaskClaimEvent(
  id: string,
  event: Result<ConcreteTaskInstance, Error>,
  timing?: TaskTiming
): TaskClaim;
export declare function asTaskRunRequestEvent(
  id: string,
  event: Err<Error>,
  timing?: TaskTiming
): TaskRunRequest;
export declare function asTaskPollingCycleEvent<T = string>(
  event: Result<ClaimAndFillPoolResult, PollingError<T>>,
  timing?: TaskTiming
): TaskPollingCycle<T>;
export declare function asTaskManagerStatEvent(
  id: TaskManagerStats,
  event: Result<number, never>
): TaskManagerStat;
export declare function asTaskManagerMetricEvent(
  event: Result<TaskManagerMetrics, never>
): TaskManagerMetric;
export declare function isTaskMarkRunningEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskMarkRunning;
export declare function isTaskRunEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskRun;
export declare function isTaskClaimEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskClaim;
export declare function isTaskRunRequestEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskRunRequest;
export declare function isTaskPollingCycleEvent<T = string>(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskPollingCycle<T>;
export declare function isTaskManagerStatEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskManagerStat;
export declare function isTaskManagerWorkerUtilizationStatEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskManagerStat;
export declare function isTaskManagerMetricEvent(
  taskEvent: TaskEvent<unknown, unknown>
): taskEvent is TaskManagerStat;
