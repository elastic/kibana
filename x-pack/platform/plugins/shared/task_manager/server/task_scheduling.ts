/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { chunk, flatten, omit } from 'lodash';
import agent from 'elastic-apm-node';
import type { Logger } from '@kbn/core/server';
import type { Middleware } from './lib/middleware';
import { parseIntervalAsMillisecond } from './lib/intervals';
import type {
  ConcreteTaskInstance,
  IntervalSchedule,
  ScheduleOptions,
  TaskInstanceWithDeprecatedFields,
  TaskInstanceWithId,
} from './task';
import { TaskStatus } from './task';
import type { TaskStore } from './task_store';
import { ensureDeprecatedFieldsAreCorrected } from './lib/correct_deprecated_fields';
import { retryableBulkUpdate } from './lib/retryable_bulk_update';
import type { ErrorOutput } from './lib/bulk_operation_buffer';

const VERSION_CONFLICT_STATUS = 409;
const BULK_ACTION_SIZE = 100;
export interface TaskSchedulingOpts {
  logger: Logger;
  taskStore: TaskStore;
  middleware: Middleware;
  taskManagerId: string;
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
}

export interface RunNowResult {
  id: ConcreteTaskInstance['id'];
  state?: ConcreteTaskInstance['state'];
}

export class TaskScheduling {
  private store: TaskStore;
  private logger: Logger;
  private middleware: Middleware;

  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism.
   */
  constructor(opts: TaskSchedulingOpts) {
    this.logger = opts.logger;
    this.middleware = opts.middleware;
    this.store = opts.taskStore;
  }

  /**
   * Schedules a task.
   *
   * @param task - The task being scheduled.
   * @returns {Promise<ConcreteTaskInstance>}
   */
  public async schedule(
    taskInstance: TaskInstanceWithDeprecatedFields,
    options?: ScheduleOptions
  ): Promise<ConcreteTaskInstance> {
    const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
      ...omit(options, 'apiKey', 'request'),
      taskInstance: ensureDeprecatedFieldsAreCorrected(taskInstance, this.logger),
    });

    const traceparent =
      agent.currentTransaction && agent.currentTransaction.type !== 'request'
        ? agent.currentTraceparent
        : '';

    return await this.store.schedule(
      {
        ...modifiedTask,
        traceparent: traceparent || '',
        enabled: modifiedTask.enabled ?? true,
      },
      options?.request
        ? {
            request: options?.request,
          }
        : undefined
    );
  }

  /**
   * Bulk schedules a task.
   *
   * @param tasks - The tasks being scheduled.
   * @returns {Promise<ConcreteTaskInstance>}
   */
  public async bulkSchedule(
    taskInstances: TaskInstanceWithDeprecatedFields[],
    options?: ScheduleOptions
  ): Promise<ConcreteTaskInstance[]> {
    const traceparent =
      agent.currentTransaction && agent.currentTransaction.type !== 'request'
        ? agent.currentTraceparent
        : '';
    const modifiedTasks = await Promise.all(
      taskInstances.map(async (taskInstance) => {
        const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
          ...omit(options, 'apiKey', 'request'),
          taskInstance: ensureDeprecatedFieldsAreCorrected(taskInstance, this.logger),
        });
        return {
          ...modifiedTask,
          traceparent: traceparent || '',
          enabled: modifiedTask.enabled ?? true,
        };
      })
    );

    return await this.store.bulkSchedule(
      modifiedTasks,
      options?.request
        ? {
            request: options?.request,
          }
        : undefined
    );
  }

  public async bulkDisable(taskIds: string[], clearStateIdsOrBoolean?: string[] | boolean) {
    return await retryableBulkUpdate({
      taskIds,
      store: this.store,
      getTasks: async (ids) => await this.bulkGetTasksHelper(ids),
      filter: (task) => !!task.enabled,
      map: (task) => ({
        ...task,
        enabled: false,
        ...((Array.isArray(clearStateIdsOrBoolean) && clearStateIdsOrBoolean.includes(task.id)) ||
        clearStateIdsOrBoolean === true
          ? { state: {} }
          : {}),
      }),
      validate: false,
    });
  }

  public async bulkEnable(taskIds: string[], runSoon: boolean = true) {
    return await retryableBulkUpdate({
      taskIds,
      store: this.store,
      getTasks: async (ids) => await this.bulkGetTasksHelper(ids),
      filter: (task) => !task.enabled,
      map: (task, i) => {
        if (runSoon) {
          // Run the first task now. Run all other tasks a random number of ms in the future,
          // with a maximum of 5 minutes or the task interval, whichever is smaller.
          const taskToRun =
            i === 0
              ? { ...task, runAt: new Date(), scheduledAt: new Date() }
              : randomlyOffsetRunTimestamp(task);
          return { ...taskToRun, enabled: true };
        }
        return { ...task, enabled: true };
      },
      validate: false,
    });
  }

  public async bulkUpdateState(
    taskIds: string[],
    stateMapFn: (s: ConcreteTaskInstance['state'], id: string) => ConcreteTaskInstance['state']
  ) {
    return await retryableBulkUpdate({
      taskIds,
      store: this.store,
      getTasks: async (ids) => await this.bulkGetTasksHelper(ids),
      filter: () => true,
      map: (task) => ({
        ...task,
        state: stateMapFn(task.state, task.id),
      }),
      validate: false,
    });
  }

  /**
   * Bulk updates schedules for tasks by ids.
   * Only tasks with `idle` status will be updated, as for the tasks which have `running` status,
   * `schedule` and `runAt` will be recalculated after task run finishes
   *
   * @param {string[]} taskIds  - list of task ids
   * @param {IntervalSchedule} schedule  - new schedule
   * @returns {Promise<BulkUpdateTaskResult>}
   */
  public async bulkUpdateSchedules(
    taskIds: string[],
    schedule: IntervalSchedule
  ): Promise<BulkUpdateTaskResult> {
    return retryableBulkUpdate({
      taskIds,
      store: this.store,
      getTasks: async (ids) => await this.bulkGetTasksHelper(ids),
      filter: (task) =>
        task.status === TaskStatus.Idle && task.schedule?.interval !== schedule.interval,
      map: (task) => {
        const oldIntervalInMs = parseIntervalAsMillisecond(task.schedule?.interval ?? '0s');

        // computing new runAt using formula:
        // newRunAt = oldRunAt - oldInterval + newInterval
        const newRunAtInMs = Math.max(
          Date.now(),
          task.runAt.getTime() - oldIntervalInMs + parseIntervalAsMillisecond(schedule.interval)
        );

        return { ...task, schedule, runAt: new Date(newRunAtInMs) };
      },
      validate: false,
    });
  }

  private async bulkGetTasksHelper(taskIds: string[]) {
    const batches = await pMap(
      chunk(taskIds, BULK_ACTION_SIZE),
      async (taskIdsChunk) => this.store.bulkGet(taskIdsChunk),
      { concurrency: 10 }
    );
    return flatten(batches);
  }

  /**
   * Run task.
   *
   * @param taskId - The task being scheduled.
   * @returns {Promise<RunSoonResult>}
   */
  public async runSoon(taskId: string): Promise<RunSoonResult> {
    const task = await this.getNonRunningTask(taskId);
    try {
      await this.store.update(
        {
          ...task,
          status: TaskStatus.Idle,
          scheduledAt: new Date(),
          runAt: new Date(),
        },
        { validate: false }
      );
    } catch (e) {
      if (e.statusCode === 409) {
        this.logger.debug(
          `Failed to update the task (${taskId}) for runSoon due to conflict (409)`
        );
      } else {
        this.logger.error(`Failed to update the task (${taskId}) for runSoon`);
        throw e;
      }
    }
    return { id: task.id };
  }

  /**
   * Schedules a task with an Id
   *
   * @param task - The task being scheduled.
   * @returns {Promise<TaskInstanceWithId>}
   */
  public async ensureScheduled(
    taskInstance: TaskInstanceWithId,
    options?: Record<string, unknown>
  ): Promise<TaskInstanceWithId> {
    try {
      return await this.schedule(taskInstance, options);
    } catch (err) {
      if (err.statusCode === VERSION_CONFLICT_STATUS) {
        return taskInstance;
      }
      throw err;
    }
  }

  private async getNonRunningTask(taskId: string) {
    const task = await this.store.get(taskId);
    switch (task.status) {
      case TaskStatus.Claiming:
      case TaskStatus.Running:
        throw Error(`Failed to run task "${taskId}" as it is currently running`);
      case TaskStatus.Unrecognized:
        throw Error(`Failed to run task "${taskId}" with status ${task.status}`);
      case TaskStatus.Failed:
      default:
        return task;
    }
  }
}

const randomlyOffsetRunTimestamp: (task: ConcreteTaskInstance) => ConcreteTaskInstance = (task) => {
  const now = Date.now();
  const maximumOffsetTimestamp = now + 1000 * 60 * 5; // now + 5 minutes
  const taskIntervalInMs = parseIntervalAsMillisecond(task.schedule?.interval ?? '0s');
  const maximumRunAt = Math.min(now + taskIntervalInMs, maximumOffsetTimestamp);

  // Offset between 1 and maximumRunAt ms
  const runAt = new Date(now + Math.floor(Math.random() * (maximumRunAt - now) + 1));
  return {
    ...task,
    runAt,
    scheduledAt: runAt,
  };
};
