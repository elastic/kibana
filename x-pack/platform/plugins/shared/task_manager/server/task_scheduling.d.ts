/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Middleware } from './lib/middleware';
import {
  type ApiKeyOptions,
  type ConcreteTaskInstance,
  type IntervalSchedule,
  type RruleSchedule,
  type ScheduleOptions,
  type TaskInstanceWithDeprecatedFields,
  type TaskInstanceWithId,
} from './task';
import type { TaskStore } from './task_store';
import type { ErrorOutput } from './lib/bulk_operation_buffer';
import type { TaskPollingLifecycle } from './polling_lifecycle';
export interface TaskSchedulingOpts {
  logger: Logger;
  taskStore: TaskStore;
  middleware: Middleware;
  taskManagerId: string;
  taskPollingLifecycle?: TaskPollingLifecycle;
}
/**
 * return type of TaskScheduling.bulkUpdateSchedules method
 */
export interface BulkUpdateTaskResult {
  /**
   * list of successfully updated tasks
   */
  tasks: ConcreteTaskInstance[];
  /**
   * list of failed tasks and errors caused failure
   */
  errors: ErrorOutput[];
}
export interface RunSoonResult {
  id: ConcreteTaskInstance['id'];
  forced: boolean;
}
export interface RunNowResult {
  id: ConcreteTaskInstance['id'];
  state?: ConcreteTaskInstance['state'];
}
export declare class TaskScheduling {
  private store;
  private logger;
  private middleware;
  private readonly taskPolling;
  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism.
   */
  constructor(opts: TaskSchedulingOpts);
  /**
   * Schedules a task.
   *
   * @param task - The task being scheduled.
   * @returns {Promise<ConcreteTaskInstance>}
   */
  schedule(
    taskInstance: TaskInstanceWithDeprecatedFields,
    options?: ScheduleOptions
  ): Promise<ConcreteTaskInstance>;
  /**
   * Bulk schedules a task.
   *
   * @param tasks - The tasks being scheduled.
   * @returns {Promise<ConcreteTaskInstance>}
   */
  bulkSchedule(
    taskInstances: TaskInstanceWithDeprecatedFields[],
    options?: ScheduleOptions
  ): Promise<ConcreteTaskInstance[]>;
  bulkDisable(
    taskIds: string[],
    clearStateIdsOrBoolean?: string[] | boolean,
    options?: ApiKeyOptions
  ): Promise<BulkUpdateTaskResult>;
  bulkEnable(
    taskIds: string[],
    runSoon?: boolean,
    options?: ApiKeyOptions
  ): Promise<BulkUpdateTaskResult>;
  bulkUpdateState(
    taskIds: string[],
    stateMapFn: (s: ConcreteTaskInstance['state'], id: string) => ConcreteTaskInstance['state'],
    options?: ApiKeyOptions
  ): Promise<BulkUpdateTaskResult>;
  /**
   * Bulk updates schedules for tasks by ids.
   * Only tasks with `idle` status will be updated, as for the tasks which have `running` status,
   * `schedule` and `runAt` will be recalculated after task run finishes
   *
   * @param {string[]} taskIds  - list of task ids
   * @param {IntervalSchedule | RruleSchedule} schedule  - new schedule
   * @returns {Promise<BulkUpdateTaskResult>}
   */
  bulkUpdateSchedules(
    taskIds: string[],
    schedule: IntervalSchedule | RruleSchedule,
    options?: ApiKeyOptions
  ): Promise<BulkUpdateTaskResult>;
  private bulkGetTasksHelper;
  /**
   * Run task.
   *
   * @param taskId - The task being scheduled.
   * @returns {Promise<RunSoonResult>}
   */
  runSoon(taskId: string, force?: boolean): Promise<RunSoonResult>;
  /**
   * Schedules a task with an Id
   *
   * @param task - The task being scheduled.
   * @returns {Promise<TaskInstanceWithId>}
   */
  ensureScheduled(
    taskInstance: TaskInstanceWithId,
    options?: ScheduleOptions
  ): Promise<TaskInstanceWithId>;
}
