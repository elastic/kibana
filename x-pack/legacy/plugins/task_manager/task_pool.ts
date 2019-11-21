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
import { Logger } from './types';
import { TaskRunner } from './task_runner';

interface Opts {
  maxWorkers: number;
  logger: Logger;
}

export enum TaskPoolRunResult {
  RunningAllClaimedTasks = 'RunningAllClaimedTasks',
  RanOutOfCapacity = 'RanOutOfCapacity',
}

const VERSION_CONFLICT_MESSAGE = 'Task has been claimed by another Kibana service';

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
    this.logger.debug('Cancelling running tasks.');
    for (const task of this.running) {
      this.cancelTask(task);
    }
  }

  private async attemptToRun(tasks: TaskRunner[]): Promise<TaskPoolRunResult> {
    const [tasksToRun, leftOverTasks] = partitionListByCount(tasks, this.availableWorkers);
    if (tasksToRun.length) {
      performance.mark('attemptToRun_start');
      await Promise.all(
        tasksToRun.map(
          async task =>
            await task
              .markTaskAsRunning()
              .then((hasTaskBeenMarkAsRunning: boolean) =>
                hasTaskBeenMarkAsRunning
                  ? this.handleMarkAsRunning(task)
                  : this.handleFailureOfMarkAsRunning(task, {
                      name: 'TaskPoolVersionConflictError',
                      message: VERSION_CONFLICT_MESSAGE,
                    })
              )
              .catch(ex => this.handleFailureOfMarkAsRunning(task, ex))
        )
      );

      performance.mark('attemptToRun_stop');
      performance.measure('taskPool.attemptToRun', 'attemptToRun_start', 'attemptToRun_stop');
    }

    if (leftOverTasks.length) {
      if (this.availableWorkers) {
        return this.attemptToRun(leftOverTasks);
      }
      return TaskPoolRunResult.RanOutOfCapacity;
    }
    return TaskPoolRunResult.RunningAllClaimedTasks;
  }

  private handleMarkAsRunning(task: TaskRunner) {
    this.running.add(task);
    task
      .run()
      .catch(err => {
        this.logger.warn(`Task ${task.toString()} failed in attempt to run: ${err.message}`);
      })
      .then(() => this.running.delete(task));
  }

  private handleFailureOfMarkAsRunning(task: TaskRunner, err: Error) {
    this.logger.error(`Failed to mark Task ${task.toString()} as running: ${err.message}`);
  }

  private cancelExpiredTasks() {
    for (const task of this.running) {
      if (task.isExpired) {
        this.logger.debug(`Cancelling expired task ${task.toString()}.`);
        this.cancelTask(task);
      }
    }
  }

  private async cancelTask(task: TaskRunner) {
    try {
      this.logger.debug(`Cancelling task ${task.toString()}.`);
      this.running.delete(task);
      await task.cancel();
    } catch (err) {
      this.logger.error(`Failed to cancel task ${task.toString()}: ${err}`);
    }
  }
}

function partitionListByCount<T>(list: T[], count: number): [T[], T[]] {
  const listInCount = list.splice(0, count);
  return [listInCount, list];
}
