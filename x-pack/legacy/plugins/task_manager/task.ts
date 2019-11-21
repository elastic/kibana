/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

/*
 * Type definitions and validations for tasks.
 */

/**
 * Require
 * @desc Create a Subtype of type T `T` such that the property under key `P` becomes required
 * @example
 *    type TaskInstance = {
 *      id?: string;
 *      name: string;
 *    };
 *
 *    // This type is now defined as { id: string; name: string; }
 *    type TaskInstanceWithId = Require<TaskInstance, 'id'>;
 */
type Require<T extends object, P extends keyof T> = Omit<T, P> & Required<Pick<T, P>>;

/**
 * A loosely typed definition of the elasticjs wrapper. It's beyond the scope
 * of this work to try to make a comprehensive type definition of this.
 */
export type ElasticJs = (action: string, args: any) => Promise<any>;

/**
 * The run context is passed into a task's run function as its sole argument.
 */
export interface RunContext {
  /**
   * The document describing the task instance, its params, state, id, etc.
   */
  taskInstance: ConcreteTaskInstance;
}

/**
 * The return value of a task's run function should be a promise of RunResult.
 */
export interface RunResult {
  /**
   * Specifies the next run date / time for this task. If unspecified, this is
   * treated as a single-run task, and will not be rescheduled after
   * completion.
   */
  runAt?: Date;

  /**
   * If specified, indicates that the task failed to accomplish its work. This is
   * logged out as a warning, and the task will be reattempted after a delay.
   */
  error?: object;

  /**
   * The state which will be passed to the next run of this task (if this is a
   * recurring task). See the RunContext type definition for more details.
   */
  state: Record<string, any>;
}

export const validateRunResult = Joi.object({
  runAt: Joi.date().optional(),
  error: Joi.object().optional(),
  state: Joi.object().optional(),
}).optional();

export type RunFunction = () => Promise<RunResult | undefined | void>;

export type CancelFunction = () => Promise<RunResult | undefined | void>;

export interface CancellableTask {
  run: RunFunction;
  cancel?: CancelFunction;
}

export type TaskRunCreatorFunction = (context: RunContext) => CancellableTask;

/**
 * Defines a task which can be scheduled and run by the Kibana
 * task manager.
 */
export interface TaskDefinition {
  /**
   * A unique identifier for the type of task being defined.
   */
  type: string;

  /**
   * A brief, human-friendly title for this task.
   */
  title: string;

  /**
   * An optional more detailed description of what this task does.
   */
  description?: string;

  /**
   * How long, in minutes or seconds, the system should wait for the task to complete
   * before it is considered to be timed out. (e.g. '5m', the default). If
   * the task takes longer than this, Kibana will send it a kill command and
   * the task will be re-attempted.
   */
  timeout?: string;

  /**
   * Up to how many times the task should retry when it fails to run. This will
   * default to the global variable.
   */
  maxAttempts?: number;

  /**
   * Function that customizes how the task should behave when the task fails. This
   * function can return `true`, `false` or a Date. True will tell task manager
   * to retry using default delay logic. False will tell task manager to stop retrying
   * this task. Date will suggest when to the task manager the task should retry.
   * This function isn't used for interval type tasks, those retry at the next interval.
   */
  getRetry?: (attempts: number, error: object) => boolean | Date;

  /**
   * Creates an object that has a run function which performs the task's work,
   * and an optional cancel function which cancels the task.
   */
  createTaskRunner: TaskRunCreatorFunction;
}

export const validateTaskDefinition = Joi.object({
  type: Joi.string().required(),
  title: Joi.string().optional(),
  description: Joi.string().optional(),
  timeout: Joi.string().default('5m'),
  maxAttempts: Joi.number()
    .min(1)
    .optional(),
  createTaskRunner: Joi.func().required(),
  getRetry: Joi.func().optional(),
}).default();

/**
 * A dictionary mapping task types to their definitions.
 */
export interface TaskDictionary<T extends TaskDefinition> {
  [taskType: string]: T;
}

export type TaskStatus = 'idle' | 'claiming' | 'running' | 'failed';

/*
 * A task instance represents all of the data required to store, fetch,
 * and execute a task.
 */
export interface TaskInstance {
  /**
   * Optional ID that can be passed by the caller. When ID is undefined, ES
   * will auto-generate a unique id. Otherwise, ID will be used to either
   * create a new document, or update existing document
   */
  id?: string;

  /**
   * The task definition type whose run function will execute this instance.
   */
  taskType: string;

  /**
   * The date and time that this task was originally scheduled. This is used
   * for convenience to task run functions, and for troubleshooting.
   */
  scheduledAt?: Date;

  /**
   * The date and time that this task started execution. This is used to determine
   * the "real" runAt that ended up running the task. This value is only set
   * when status is set to "running".
   */
  startedAt?: Date | null;

  /**
   * The date and time that this task should re-execute if stuck in "running" / timeout
   * status. This value is only set when status is set to "running".
   */
  retryAt?: Date | null;

  /**
   * The date and time that this task is scheduled to be run. It is not
   * guaranteed to run at this time, but it is guaranteed not to run earlier
   * than this. Defaults to immediately.
   */
  runAt?: Date;

  /**
   * An interval in minutes (e.g. '5m'). If specified, this is a recurring task.
   */
  interval?: string;

  /**
   * A task-specific set of parameters, used by the task's run function to tailor
   * its work. This is generally user-input, such as { sms: '333-444-2222' }.
   */
  params: Record<string, any>;

  /**
   * The state passed into the task's run function, and returned by the previous
   * run. If there was no previous run, or if the previous run did not return
   * any state, this will be the empy object: {}
   */
  state: Record<string, any>;

  /**
   * The id of the user who scheduled this task.
   */
  user?: string;

  /**
   * Used to group tasks for querying. So, reporting might schedule tasks with a scope of 'reporting',
   * and then query such tasks to provide a glimpse at only reporting tasks, rather than at all tasks.
   */
  scope?: string[];

  /**
   * The random uuid of the Kibana instance which claimed ownership of the task last
   */
  ownerId?: string | null;
}

/**
 * A task instance that has an id.
 */
export type TaskInstanceWithId = Require<TaskInstance, 'id'>;

/**
 * A task instance that has an id and is ready for storage.
 */
export interface ConcreteTaskInstance extends TaskInstance {
  /**
   * The id of the Elastic document that stores this instance's data. This can
   * be passed by the caller when scheduling the task.
   */
  id: string;

  /**
   * The saved object version from the Elaticsearch document.
   */
  version?: string;

  /**
   * The date and time that this task was originally scheduled. This is used
   * for convenience to task run functions, and for troubleshooting.
   */
  scheduledAt: Date;

  /**
   * The number of unsuccessful attempts since the last successful run. This
   * will be zeroed out after a successful run.
   */
  attempts: number;

  /**
   * Indicates whether or not the task is currently running.
   */
  status: TaskStatus;

  /**
   * The date and time that this task is scheduled to be run. It is not guaranteed
   * to run at this time, but it is guaranteed not to run earlier than this.
   */
  runAt: Date;

  /**
   * The date and time that this task started execution. This is used to determine
   * the "real" runAt that ended up running the task. This value is only set
   * when status is set to "running".
   */
  startedAt: Date | null;

  /**
   * The date and time that this task should re-execute if stuck in "running" / timeout
   * status. This value is only set when status is set to "running".
   */
  retryAt: Date | null;

  /**
   * The state passed into the task's run function, and returned by the previous
   * run. If there was no previous run, or if the previous run did not return
   * any state, this will be the empy object: {}
   */
  state: Record<string, any>;

  /**
   * The random uuid of the Kibana instance which claimed ownership of the task last
   */
  ownerId: string | null;
}
