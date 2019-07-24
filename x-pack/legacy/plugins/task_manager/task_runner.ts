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

import Joi from 'joi';
import { intervalFromNow, minutesFromNow } from './lib/intervals';
import { Logger } from './lib/logger';
import { BeforeRunFunction } from './lib/middleware';
import {
  CancelFunction,
  CancellableTask,
  ConcreteTaskInstance,
  RunResult,
  SanitizedTaskDefinition,
  TaskDictionary,
  validateRunResult,
} from './task';
import { RemoveResult } from './task_store';

export interface TaskRunner {
  numWorkers: number;
  isExpired: boolean;
  cancel: CancelFunction;
  claimOwnership: () => Promise<boolean>;
  run: () => Promise<RunResult>;
  toString?: () => string;
}

interface Updatable {
  readonly maxAttempts: number;
  update(doc: ConcreteTaskInstance): Promise<ConcreteTaskInstance>;
  remove(id: string): Promise<RemoveResult>;
}

interface Opts {
  logger: Logger;
  definitions: TaskDictionary<SanitizedTaskDefinition>;
  instance: ConcreteTaskInstance;
  store: Updatable;
  kbnServer: any;
  beforeRun: BeforeRunFunction;
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
  private definitions: TaskDictionary<SanitizedTaskDefinition>;
  private logger: Logger;
  private store: Updatable;
  private kbnServer: any;
  private beforeRun: BeforeRunFunction;

  /**
   * Creates an instance of TaskManagerRunner.
   * @param {Opts} opts
   * @prop {Logger} logger - The task manager logger
   * @prop {TaskDefinition} definition - The definition of the task being run
   * @prop {ConcreteTaskInstance} instance - The record describing this particular task instance
   * @prop {Updatable} store - The store used to read / write tasks instance info
   * @prop {kbnServer} kbnServer - An async function that provides the task's run context
   * @prop {BeforeRunFunction} beforeRun - A function that adjusts the run context prior to running the task
   * @memberof TaskManagerRunner
   */
  constructor(opts: Opts) {
    this.instance = sanitizeInstance(opts.instance);
    this.definitions = opts.definitions;
    this.logger = opts.logger;
    this.store = opts.store;
    this.kbnServer = opts.kbnServer;
    this.beforeRun = opts.beforeRun;
  }

  /**
   * Gets how many workers are occupied by this task instance.
   * Per Joi validation logic, this will return a number >= 1
   */
  public get numWorkers() {
    return this.definition.numWorkers;
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
    return this.instance.runAt < new Date();
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
      kbnServer: this.kbnServer,
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
  public async claimOwnership(): Promise<boolean> {
    const VERSION_CONFLICT_STATUS = 409;

    try {
      this.instance = await this.store.update({
        ...this.instance,
        status: 'running',
        runAt: intervalFromNow(this.definition.timeout)!,
      });

      return true;
    } catch (error) {
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

    this.logger.warning(`The task ${this} is not cancellable.`);
  }

  private validateResult(result?: RunResult | void): RunResult {
    const { error } = Joi.validate(result, validateRunResult);

    if (error) {
      this.logger.warning(`Invalid task result for ${this}: ${error.message}`);
    }

    return result || { state: {} };
  }

  private async processResultForRecurringTask(result: RunResult): Promise<RunResult> {
    // recurring task: update the task instance
    const state = result.state || this.instance.state || {};
    const status = this.instance.attempts < this.store.maxAttempts ? 'idle' : 'failed';

    let runAt;
    if (status === 'failed') {
      // task run errored, keep the same runAt
      runAt = this.instance.runAt;
    } else {
      runAt =
        result.runAt ||
        intervalFromNow(this.instance.interval) ||
        // when result.error is truthy, then we're retrying because it failed
        minutesFromNow((this.instance.attempts + 1) * 5); // incrementally backs off an extra 5m per failure
    }

    await this.store.update({
      ...this.instance,
      runAt,
      state,
      status,
      attempts: result.error ? this.instance.attempts + 1 : 0,
    });

    return result;
  }

  private async processResultWhenDone(result: RunResult): Promise<RunResult> {
    // not a recurring task: clean up by removing the task instance from store
    try {
      await this.store.remove(this.instance.id);
    } catch (err) {
      if (err.statusCode === 404) {
        this.logger.warning(
          `Task cleanup of ${this} failed in processing. Was remove called twice?`
        );
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
}

function sanitizeInstance(instance: ConcreteTaskInstance): ConcreteTaskInstance {
  return {
    ...instance,
    params: instance.params || {},
    state: instance.state || {},
  };
}
