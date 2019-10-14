/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains the logic that ensures we don't run too many
 * tasks at once in a given Kibana instance.
 */
import { zip } from 'lodash';
import { Logger } from './types';
import { TaskRunner } from './task_runner';

interface Opts {
  maxWorkers: number;
  logger: Logger;
}

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
    this.logger.debug(`Cancelling running tasks.`);
    for (const task of this.running) {
      this.cancelTask(task);
    }
  }

  private async attemptToRun(tasks: TaskRunner[]): Promise<boolean> {
    const tasksToRun = tasks.splice(0, this.availableWorkers);
    if (tasksToRun.length) {
      zipMultiTypedArrays(
        tasksToRun,
        await Promise.all(tasksToRun.map(task => task.markTaskAsRunning()))
      ).forEach(([task, hasTaskBeenMarkAsRunning]) => {
        if (hasTaskBeenMarkAsRunning) {
          this.running.add(task);
          task
            .run()
            .catch(err => {
              this.logger.warn(`Task ${task} failed in attempt to run: ${err.message}`);
            })
            .then(() => this.running.delete(task));
        } else {
          this.logger.warn(`Failed to mark Task ${task} as running`);
        }
      });
    }
    if (tasks.length) {
      if (this.availableWorkers) {
        return this.attemptToRun(tasks);
      }
      return false;
    }
    return true;
  }

  private cancelExpiredTasks() {
    for (const task of this.running) {
      if (task.isExpired) {
        this.logger.debug(`Cancelling expired task ${task}.`);
        this.cancelTask(task);
      }
    }
  }

  private async cancelTask(task: TaskRunner) {
    try {
      this.logger.debug(`Cancelling task ${task}.`);
      this.running.delete(task);
      await task.cancel();
    } catch (err) {
      this.logger.error(`Failed to cancel task ${task}: ${err}`);
    }
  }
}

// sadly the type signature on lodash doesn't allow zipping across types
// but we can still use their implementation and implement the signature
// ourselves
function zipMultiTypedArrays<T, S>(left: T[], right: S[]): Array<[T, S]> {
  return zip<any>(left, right) as Array<[T, S]>;
}
