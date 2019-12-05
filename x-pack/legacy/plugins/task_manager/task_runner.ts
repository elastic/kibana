/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * This module contains the core logic for running an individual task.
 * It handles the full lifecycle of a task run, including error handling,
 * rescheduling, middleware application, etc.
 */

import { performance } from 'perf_hooks';
import Joi from 'joi';
import { intervalFromDate, intervalFromNow } from './lib/intervals';
import { Logger } from './types';
import { BeforeRunFunction, BeforeMarkRunningFunction } from './lib/middleware';
import {
  CancelFunction,
  CancellableTask,
  ConcreteTaskInstance,
  RunResult,
  TaskDefinition,
  TaskDictionary,
  validateRunResult,
  TaskStatus,
} from './task';

const defaultBackoffPerFailure = 5 * 60 * 1000;

export interface TaskRunner {
  isExpired: boolean;
  cancel: CancelFunction;
  markTaskAsRunning: () => Promise<boolean>;
  run: () => Promise<RunResult>;
  toString: () => string;
}

interface Updatable {
  readonly maxAttempts: number;
  update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance>;
  remove(id: string): Promise<void>;
}

interface Opts {
  logger: Logger;
  definitions: TaskDictionary<TaskDefinition>;
  instance: ConcreteTaskInstance;
  store: Updatable;
  beforeRun: BeforeRunFunction;
  beforeMarkRunning: BeforeMarkRunningFunction;
}

/**
 * Runs a background task, ensures that errors are properly handled,
 * allows for cancellation.
 *
 * @export
 * @class TaskManagerRunner
 * @implements {TaskRunner}
 */
export class TaskManagerRunner implements TaskRunner {
  private task?: CancellableTask;
  private instance: ConcreteTaskInstance;
  private definitions: TaskDictionary<TaskDefinition>;
  private logger: Logger;
  private bufferedTaskStore: Updatable;
  private beforeRun: BeforeRunFunction;
  private beforeMarkRunning: BeforeMarkRunningFunction;

  /**
   * Creates an instance of TaskManagerRunner.
   * @param {Opts} opts
   * @prop {Logger} logger - The task manager logger
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {ConcreteTaskInstance} instance - The record describing this particular task instance
   * @prop {Updatable} store - The store used to read / write tasks instance info
   * @prop {BeforeRunFunction} beforeRun - A function that adjusts the run context prior to running the task
   * @memberof TaskManagerRunner
   */
  constructor(opts: Opts) {
    this.instance = sanitizeInstance(opts.instance);
    this.definitions = opts.definitions;
    this.logger = opts.logger;
    this.bufferedTaskStore = opts.store;
    this.beforeRun = opts.beforeRun;
    this.beforeMarkRunning = opts.beforeMarkRunning;
  }

  /**
   * Gets the id of this task instance.
   */
  public get id() {
    return this.instance.id;
  }

  /**
   * Gets the task type of this task instance.
   */
  public get taskType() {
    return this.instance.taskType;
  }

  /**
   * Gets the task defintion from the dictionary.
   */
  public get definition() {
    return this.definitions[this.taskType];
  }

  /**
   * Gets whether or not this task has run longer than its expiration setting allows.
   */
  public get isExpired() {
    return intervalFromDate(this.instance.startedAt!, this.definition.timeout)! < new Date();
  }

  /**
   * Returns a log-friendly representation of this task.
   */
  public toString() {
    return `${this.taskType} "${this.id}"`;
  }

  /**
   * Runs the task, handling the task result, errors, etc, rescheduling if need
   * be. NOTE: the time of applying the middleware's beforeRun is incorporated
   * into the total timeout time the task in configured with. We may decide to
   * start the timer after beforeRun resolves
   *
   * @returns {Promise<RunResult>}
   */
  public async run(): Promise<RunResult> {
    this.logger.debug(`Running task ${this}`);
    const modifiedContext = await this.beforeRun({
      taskInstance: this.instance,
    });

    try {
      this.task = this.definition.createTaskRunner(modifiedContext);
      const result = await this.task.run();
      const validatedResult = this.validateResult(result);
      return this.processResult(validatedResult);
    } catch (err) {
      this.logger.error(`Task ${this} failed: ${err}`);

      // in error scenario, we can not get the RunResult
      // re-use modifiedContext's state, which is correct as of beforeRun
      return this.processResult({ error: err, state: modifiedContext.taskInstance.state });
    }
  }

  /**
   * Attempts to claim exclusive rights to run the task. If the attempt fails
   * with a 409 (http conflict), we assume another Kibana instance beat us to the punch.
   *
   * @returns {Promise<boolean>}
   */
  public async markTaskAsRunning(): Promise<boolean> {
    performance.mark('markTaskAsRunning_start');

    const VERSION_CONFLICT_STATUS = 409;
    const now = new Date();

    const { taskInstance } = await this.beforeMarkRunning({
      taskInstance: this.instance,
    });

    const attempts = taskInstance.attempts + 1;
    const ownershipClaimedUntil = taskInstance.retryAt;

    try {
      const { id } = taskInstance;

      const timeUntilClaimExpires = howManyMsUntilOwnershipClaimExpires(ownershipClaimedUntil);
      if (timeUntilClaimExpires < 0) {
        this.logger.debug(
          `[Task Runner] Task ${id} started after ownership expired (${Math.abs(
            timeUntilClaimExpires
          )}ms after expiry)`
        );
      }

      this.instance = await this.bufferedTaskStore.update({
        ...taskInstance,
        status: 'running',
        startedAt: now,
        attempts,
        retryAt: this.instance.interval
          ? intervalFromNow(this.definition.timeout)!
          : this.getRetryDelay({
              attempts,
              // Fake an error. This allows retry logic when tasks keep timing out
              // and lets us set a proper "retryAt" value each time.
              error: new Error('Task timeout'),
              addDuration: this.definition.timeout,
            }),
      });

      const timeUntilClaimExpiresAfterUpdate = howManyMsUntilOwnershipClaimExpires(
        ownershipClaimedUntil
      );
      if (timeUntilClaimExpiresAfterUpdate < 0) {
        this.logger.debug(
          `[Task Runner] Task ${id} ran after ownership expired (${Math.abs(
            timeUntilClaimExpiresAfterUpdate
          )}ms after expiry)`
        );
      }

      performanceStopMarkingTaskAsRunning();
      return true;
    } catch (error) {
      performanceStopMarkingTaskAsRunning();
      if (error.statusCode !== VERSION_CONFLICT_STATUS) {
        throw error;
      }
    }
    return false;
  }

  /**
   * Attempts to cancel the task.
   *
   * @returns {Promise<void>}
   */
  public async cancel() {
    const { task } = this;
    if (task && task.cancel) {
      this.task = undefined;
      return task.cancel();
    }

    this.logger.warn(`The task ${this} is not cancellable.`);
  }

  private validateResult(result?: RunResult | void): RunResult {
    const { error } = Joi.validate(result, validateRunResult);

    if (error) {
      this.logger.warn(`Invalid task result for ${this}: ${error.message}`);
    }

    return result || { state: {} };
  }

  private async processResultForRecurringTask(result: RunResult): Promise<RunResult> {
    // recurring task: update the task instance
    const startedAt = this.instance.startedAt!;
    const state = result.state || this.instance.state || {};
    let status: TaskStatus = this.getInstanceStatus();

    let runAt;
    if (status === 'failed') {
      // task run errored, keep the same runAt
      runAt = this.instance.runAt;
    } else if (result.runAt) {
      runAt = result.runAt;
    } else if (result.error) {
      // when result.error is truthy, then we're retrying because it failed
      const newRunAt = this.instance.interval
        ? intervalFromDate(startedAt, this.instance.interval)!
        : this.getRetryDelay({
            attempts: this.instance.attempts,
            error: result.error,
          });
      if (!newRunAt) {
        status = 'failed';
        runAt = this.instance.runAt;
      } else {
        runAt = newRunAt;
      }
    } else {
      runAt = intervalFromDate(startedAt, this.instance.interval)!;
    }

    await this.bufferedTaskStore.update({
      ...this.instance,
      runAt,
      state,
      status,
      startedAt: null,
      retryAt: null,
      ownerId: null,
      attempts: result.error ? this.instance.attempts : 0,
    });

    return result;
  }

  private async processResultWhenDone(result: RunResult): Promise<RunResult> {
    // not a recurring task: clean up by removing the task instance from store
    try {
      await this.bufferedTaskStore.remove(this.instance.id);
    } catch (err) {
      if (err.statusCode === 404) {
        this.logger.warn(`Task cleanup of ${this} failed in processing. Was remove called twice?`);
      } else {
        throw err;
      }
    }

    return result;
  }

  private async processResult(result: RunResult): Promise<RunResult> {
    if (result.runAt || this.instance.interval || result.error) {
      await this.processResultForRecurringTask(result);
    } else {
      await this.processResultWhenDone(result);
    }
    return result;
  }

  private getInstanceStatus() {
    if (this.instance.interval) {
      return 'idle';
    }

    const maxAttempts = this.definition.maxAttempts || this.bufferedTaskStore.maxAttempts;
    return this.instance.attempts < maxAttempts ? 'idle' : 'failed';
  }

  private getRetryDelay({
    error,
    attempts,
    addDuration,
  }: {
    error: any;
    attempts: number;
    addDuration?: string;
  }): Date | null {
    let result = null;

    // Use custom retry logic, if any, otherwise we'll use the default logic
    const retry: boolean | Date = this.definition.getRetry
      ? this.definition.getRetry(attempts, error)
      : true;

    if (retry instanceof Date) {
      result = retry;
    } else if (retry === true) {
      result = new Date(Date.now() + attempts * defaultBackoffPerFailure);
    }

    // Add a duration to the result
    if (addDuration && result) {
      result = intervalFromDate(result, addDuration)!;
    }

    return result;
  }
}

function sanitizeInstance(instance: ConcreteTaskInstance): ConcreteTaskInstance {
  return {
    ...instance,
    params: instance.params || {},
    state: instance.state || {},
  };
}

function howManyMsUntilOwnershipClaimExpires(ownershipClaimedUntil: Date | null): number {
  return ownershipClaimedUntil ? ownershipClaimedUntil.getTime() - Date.now() : 0;
}

function performanceStopMarkingTaskAsRunning() {
  performance.mark('markTaskAsRunning_stop');
  performance.measure(
    'taskRunner.markTaskAsRunning',
    'markTaskAsRunning_start',
    'markTaskAsRunning_stop'
  );
}
