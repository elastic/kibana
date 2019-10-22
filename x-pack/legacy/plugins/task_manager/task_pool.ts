/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains the logic that ensures we don't run too many
 * tasks at once in a given Kibana instance.
 */
import { performance } from 'perf_hooks';
import { i18n } from '@kbn/i18n';
import { Logger } from './types';
import { TaskRunner } from './task_runner';

import { either, asErr, asOk, Ok, Err } from './lib/result_type';

interface Opts {
  maxWorkers: number;
  logger: Logger;
}

export enum TaskPoolRunResult {
  RunningAllClaimedTasks = 'RunningAllClaimedTasks',
  RanOutOfCapacity = 'RanOutOfCapacity',
}

const VERSION_CONFLICT_MESSAGE = i18n.translate(
  'xpack.taskManager.taskPool.runAttempt.versionConflict',
  {
    defaultMessage: 'Task has been claimed by another Kibana service',
  }
);

/**
 * Runs tasks in batches, taking costs into account.
 */
export class TaskPool {
  private maxWorkers: number;
  private running = new Set<TaskRunner>();
  private logger: Logger;

  /**
   * Creates an instance of TaskPool.
   *
   * @param {Opts} opts
   * @prop {number} maxWorkers - The total number of workers / work slots available
   *    (e.g. maxWorkers is 4, then 2 tasks of cost 2 can run at a time, or 4 tasks of cost 1)
   * @prop {Logger} logger - The task manager logger.
   */
  constructor(opts: Opts) {
    this.maxWorkers = opts.maxWorkers;
    this.logger = opts.logger;
  }

  /**
   * Gets how many workers are currently in use.
   */
  public get occupiedWorkers() {
    return this.running.size;
  }

  /**
   * Gets how many workers are currently available.
   */
  public get availableWorkers() {
    return this.maxWorkers - this.occupiedWorkers;
  }

  /**
   * Attempts to run the specified list of tasks. Returns true if it was able
   * to start every task in the list, false if there was not enough capacity
   * to run every task.
   *
   * @param {TaskRunner[]} tasks
   * @returns {Promise<boolean>}
   */
  public run = (tasks: TaskRunner[]) => {
    this.cancelExpiredTasks();
    return this.attemptToRun(tasks);
  };

  public cancelRunningTasks() {
    this.logger.debug(
      i18n.translate('xpack.taskManager.taskPool.cancelRunningTasks', {
        defaultMessage: 'Cancelling running tasks.',
      })
    );
    for (const task of this.running) {
      this.cancelTask(task);
    }
  }

  private async attemptToRun(tasks: TaskRunner[]): Promise<TaskPoolRunResult> {
    const [tasksToRun, leftOverTasks] = partitionListByCount(tasks, this.availableWorkers);
    if (tasksToRun.length) {
      performance.mark('attemptToRun_start');
      const taskRunResults = await Promise.all(
        tasksToRun.map(task =>
          task
            .markTaskAsRunning()
            .then((hasTaskBeenMarkAsRunning: boolean) =>
              hasTaskBeenMarkAsRunning
                ? (asOk(task) as Ok<TaskRunner>)
                : (asErr([task, { message: VERSION_CONFLICT_MESSAGE }]) as Err<[TaskRunner, Error]>)
            )
            .catch((ex: Error) => asErr([task, ex]) as Err<[TaskRunner, Error]>)
        )
      );

      taskRunResults.forEach(
        either(
          task => {
            this.running.add(task);
            task
              .run()
              .catch(err => {
                this.logger.warn(
                  i18n.translate('xpack.taskManager.taskPool.runAttempt.genericError', {
                    defaultMessage: 'Task {task} failed in attempt to run: {message}',
                    values: {
                      message: err.message,
                      task: task.toString(),
                    },
                  })
                );
              })
              .then(() => this.running.delete(task));
          },
          ([task, err]) => {
            this.logger.error(
              i18n.translate('xpack.taskManager.taskPool.markAsRunning.genericError', {
                defaultMessage: 'Failed to mark Task {task} as running: {message}',
                values: {
                  message: err.message,
                  task: task.toString(),
                },
              })
            );
          }
        )
      );
      performance.mark('attemptToRun_stop');
      performance.measure('taskPool.attemptToRun', 'attemptToRun_start', 'attemptToRun_stop');
    }

    if (leftOverTasks.length) {
      if (this.availableWorkers) {
        return this.attemptToRun(tasks);
      }
      return TaskPoolRunResult.RanOutOfCapacity;
    }
    return TaskPoolRunResult.RunningAllClaimedTasks;
  }

  private cancelExpiredTasks() {
    for (const task of this.running) {
      if (task.isExpired) {
        this.logger.debug(
          i18n.translate('xpack.taskManager.taskPool.cancelExpiredTasks', {
            defaultMessage: 'Cancelling expired task {task}.',
            values: {
              task: task.toString(),
            },
          })
        );
        this.cancelTask(task);
      }
    }
  }

  private async cancelTask(task: TaskRunner) {
    try {
      this.logger.debug(
        i18n.translate('xpack.taskManager.taskPool.cancelTask', {
          defaultMessage: 'Cancelling task {task}.',
          values: {
            task: task.toString(),
          },
        })
      );
      this.running.delete(task);
      await task.cancel();
    } catch (err) {
      this.logger.error(
        i18n.translate('xpack.taskManager.taskPool.cancelTaskFailure', {
          defaultMessage: 'Failed to cancel task {task}: {err}',
          values: {
            err,
            task: task.toString(),
          },
        })
      );
    }
  }
}

function partitionListByCount<T>(list: T[], count: number): [T[], T[]] {
  const listInCount = list.splice(0, count);
  return [listInCount, list];
}
