/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Subject, Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { performance } from 'perf_hooks';

import { pipe } from 'fp-ts/lib/pipeable';
import { Option, none, some, map as mapOptional } from 'fp-ts/lib/Option';

import { SavedObjectsClientContract, SavedObjectsSerializer } from '../../../../../src/core/server';
import { Result, asErr, either, map, mapErr, promiseResult } from './lib/result_type';
import { TaskManagerConfig } from '../../../../plugins/kibana_task_manager/server';

import { Logger } from './types';
import {
  TaskMarkRunning,
  TaskRun,
  TaskClaim,
  TaskRunRequest,
  isTaskRunEvent,
  isTaskClaimEvent,
  isTaskRunRequestEvent,
  asTaskRunRequestEvent,
} from './task_events';
import { fillPool, FillPoolResult } from './lib/fill_pool';
import { addMiddlewareToChain, BeforeSaveMiddlewareParams, Middleware } from './lib/middleware';
import { sanitizeTaskDefinitions } from './lib/sanitize_task_definitions';
import { intervalFromNow } from './lib/intervals';
import {
  TaskDefinition,
  TaskDictionary,
  ConcreteTaskInstance,
  RunContext,
  TaskInstanceWithId,
  TaskInstanceWithDeprecatedFields,
  TaskLifecycle,
  TaskLifecycleResult,
  TaskStatus,
} from './task';
import { createTaskPoller, PollingError, PollingErrorType } from './task_poller';
import { TaskPool } from './task_pool';
import { TaskManagerRunner, TaskRunner } from './task_runner';
import {
  FetchOpts,
  FetchResult,
  TaskStore,
  OwnershipClaimingOpts,
  ClaimOwnershipResult,
} from './task_store';
import { identifyEsError } from './lib/identify_es_error';
import { ensureDeprecatedFieldsAreCorrected } from './lib/correct_deprecated_fields';

const VERSION_CONFLICT_STATUS = 409;

export interface TaskManagerOpts {
  logger: Logger;
  config: TaskManagerConfig;
  callWithInternalUser: any;
  savedObjectsRepository: SavedObjectsClientContract;
  serializer: SavedObjectsSerializer;
  taskManagerId: string;
}

interface RunNowResult {
  id: string;
}

export type TaskLifecycleEvent = TaskMarkRunning | TaskRun | TaskClaim | TaskRunRequest;

/*
 * The TaskManager is the public interface into the task manager system. This glues together
 * all of the disparate modules in one integration point. The task manager operates in two different ways:
 *
 * - pre-init, it allows middleware registration, but disallows task manipulation
 * - post-init, it disallows middleware registration, but allows task manipulation
 *
 * Due to its complexity, this is mostly tested by integration tests (see readme).
 */

/**
 * The public interface into the task manager system.
 */
export class TaskManager {
  private definitions: TaskDictionary<TaskDefinition> = {};
  private store: TaskStore;
  private logger: Logger;
  private pool: TaskPool;
  // all task related events (task claimed, task marked as running, etc.) are emitted through events$
  private events$ = new Subject<TaskLifecycleEvent>();
  // all on-demand requests we wish to pipe into the poller
  private claimRequests$ = new Subject<Option<string>>();
  // the task poller that polls for work on fixed intervals and on demand
  private poller$: Observable<Result<FillPoolResult, PollingError<string>>>;
  // our subscription to the poller
  private pollingSubscription: Subscription = Subscription.EMPTY;

  private startQueue: Array<() => void> = [];
  private middleware = {
    beforeSave: async (saveOpts: BeforeSaveMiddlewareParams) => saveOpts,
    beforeRun: async (runOpts: RunContext) => runOpts,
    beforeMarkRunning: async (runOpts: RunContext) => runOpts,
  };

  private shouldAllowRegistrationAfterStart: boolean;

  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism.
   */
  constructor(opts: TaskManagerOpts) {
    this.logger = opts.logger;
    this.shouldAllowRegistrationAfterStart = true;

    const { taskManagerId } = opts;
    if (!taskManagerId) {
      this.logger.error(
        `TaskManager is unable to start as there the Kibana UUID is invalid (value of the "server.uuid" configuration is ${taskManagerId})`
      );
      throw new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`);
    } else {
      this.logger.info(`TaskManager is identified by the Kibana UUID: ${taskManagerId}`);
    }

    this.store = new TaskStore({
      serializer: opts.serializer,
      savedObjectsRepository: opts.savedObjectsRepository,
      callCluster: opts.callWithInternalUser,
      index: opts.config.index,
      maxAttempts: opts.config.max_attempts,
      definitions: this.definitions,
      taskManagerId: `kibana:${taskManagerId}`,
    });
    // pipe store events into the TaskManager's event stream
    this.store.events.subscribe(event => this.events$.next(event));

    this.pool = new TaskPool({
      logger: this.logger,
      maxWorkers: opts.config.max_workers,
    });

    this.poller$ = createTaskPoller<string, FillPoolResult>({
      pollInterval: opts.config.poll_interval,
      bufferCapacity: opts.config.request_capacity,
      getCapacity: () => this.pool.availableWorkers,
      pollRequests$: this.claimRequests$,
      work: this.pollForWork,
    });
  }

  private emitEvent = (event: TaskLifecycleEvent) => {
    this.events$.next(event);
  };

  private attemptToRun(task: Option<string> = none) {
    this.claimRequests$.next(task);
  }

  private createTaskRunnerForTask = (instance: ConcreteTaskInstance) => {
    return new TaskManagerRunner({
      logger: this.logger,
      instance,
      store: this.store,
      definitions: this.definitions,
      beforeRun: this.middleware.beforeRun,
      beforeMarkRunning: this.middleware.beforeMarkRunning,
      onTaskEvent: this.emitEvent,
    });
  };

  public get isStarted() {
    return !this.pollingSubscription.closed;
  }

  private pollForWork = async (...tasksToClaim: string[]): Promise<FillPoolResult> => {
    return fillPool(
      // claim available tasks
      () =>
        claimAvailableTasks(
          tasksToClaim.splice(0, this.pool.availableWorkers),
          this.store.claimAvailableTasks,
          this.pool.availableWorkers,
          this.logger
        ),
      // wrap each task in a Task Runner
      this.createTaskRunnerForTask,
      // place tasks in the Task Pool
      async (tasks: TaskRunner[]) => await this.pool.run(tasks)
    );
  };

  /**
   * Starts up the task manager and starts picking up tasks.
   */
  public start() {
    if (!this.isStarted) {
      // Some calls are waiting until task manager is started
      this.startQueue.forEach(fn => fn());
      this.startQueue = [];

      this.pollingSubscription = this.poller$.subscribe(
        mapErr((error: PollingError<string>) => {
          if (error.type === PollingErrorType.RequestCapacityReached) {
            pipe(
              error.data,
              mapOptional(id => this.emitEvent(asTaskRunRequestEvent(id, asErr(error))))
            );
          }
          this.logger.error(error.message);
        })
      );
    }
  }

  private async waitUntilStarted() {
    if (!this.isStarted) {
      await new Promise(resolve => {
        this.startQueue.push(resolve);
      });
    }
  }

  /**
   * Stops the task manager and cancels running tasks.
   */
  public stop() {
    if (this.isStarted) {
      this.pollingSubscription.unsubscribe();
      this.pool.cancelRunningTasks();
    }
  }

  /**
   * Method for allowing consumers to register task definitions into the system.
   * @param taskDefinitions - The Kibana task definitions dictionary
   */
  public registerTaskDefinitions(taskDefinitions: TaskDictionary<TaskDefinition>) {
    this.assertUninitialized('register task definitions');
    const duplicate = Object.keys(taskDefinitions).find(k => !!this.definitions[k]);
    if (duplicate) {
      throw new Error(`Task ${duplicate} is already defined!`);
    }

    try {
      const sanitized = sanitizeTaskDefinitions(taskDefinitions);

      Object.assign(this.definitions, sanitized);
    } catch (e) {
      this.logger.error('Could not sanitize task definitions');
    }
  }

  /**
   * Adds middleware to the task manager, such as adding security layers, loggers, etc.
   *
   * @param {Middleware} middleware - The middlware being added.
   */
  public addMiddleware(middleware: Middleware) {
    this.assertUninitialized('add middleware');
    const prevMiddleWare = this.middleware;
    this.middleware = addMiddlewareToChain(prevMiddleWare, middleware);
  }

  /**
   * Schedules a task.
   *
   * @param task - The task being scheduled.
   * @returns {Promise<ConcreteTaskInstance>}
   */
  public async schedule(
    taskInstance: TaskInstanceWithDeprecatedFields,
    options?: any
  ): Promise<ConcreteTaskInstance> {
    await this.waitUntilStarted();
    const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
      ...options,
      taskInstance: ensureDeprecatedFieldsAreCorrected(taskInstance, this.logger),
    });
    const result = await this.store.schedule(modifiedTask);
    this.attemptToRun();
    return result;
  }

  /**
   * Run  task.
   *
   * @param taskId - The task being scheduled.
   * @returns {Promise<ConcreteTaskInstance>}
   */
  public async runNow(taskId: string): Promise<RunNowResult> {
    await this.waitUntilStarted();
    return new Promise(async (resolve, reject) => {
      awaitTaskRunResult(taskId, this.events$, this.store.getLifecycle.bind(this.store))
        .then(resolve)
        .catch(reject);

      this.attemptToRun(some(taskId));
    });
  }

  /**
   * Schedules a task with an Id
   *
   * @param task - The task being scheduled.
   * @returns {Promise<TaskInstanceWithId>}
   */
  public async ensureScheduled(
    taskInstance: TaskInstanceWithId,
    options?: any
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

  /**
   * Fetches a paginatable list of scheduled tasks.
   *
   * @param opts - The query options used to filter tasks
   * @returns {Promise<FetchResult>}
   */
  public async fetch(opts: FetchOpts): Promise<FetchResult> {
    await this.waitUntilStarted();
    return this.store.fetch(opts);
  }

  /**
   * Removes the specified task from the index.
   *
   * @param {string} id
   * @returns {Promise<RemoveResult>}
   */
  public async remove(id: string): Promise<void> {
    await this.waitUntilStarted();
    return this.store.remove(id);
  }

  /**
   * Ensures task manager IS NOT already initialized
   *
   * @param {string} message shown if task manager is already initialized
   * @returns void
   */
  private assertUninitialized(message: string) {
    if (!this.shouldAllowRegistrationAfterStart && this.isStarted) {
      throw new Error(`Cannot ${message} after the task manager is initialized!`);
    }
  }
}

export async function claimAvailableTasks(
  claimTasksById: string[],
  claim: (opts: OwnershipClaimingOpts) => Promise<ClaimOwnershipResult>,
  availableWorkers: number,
  logger: Logger
) {
  if (availableWorkers > 0) {
    performance.mark('claimAvailableTasks_start');

    try {
      const { docs, claimedTasks } = await claim({
        size: availableWorkers,
        claimOwnershipUntil: intervalFromNow('30s')!,
        claimTasksById,
      });

      if (claimedTasks === 0) {
        performance.mark('claimAvailableTasks.noTasks');
      }
      performance.mark('claimAvailableTasks_stop');
      performance.measure(
        'claimAvailableTasks',
        'claimAvailableTasks_start',
        'claimAvailableTasks_stop'
      );

      if (docs.length !== claimedTasks) {
        logger.warn(
          `[Task Ownership error]: (${claimedTasks}) tasks were claimed by Kibana, but (${docs.length}) tasks were fetched`
        );
      }
      return docs;
    } catch (ex) {
      if (identifyEsError(ex).includes('cannot execute [inline] scripts')) {
        logger.warn(
          `Task Manager cannot operate when inline scripts are disabled in Elasticsearch`
        );
      } else {
        throw ex;
      }
    }
  } else {
    performance.mark('claimAvailableTasks.noAvailableWorkers');
    logger.info(
      `[Task Ownership]: Task Manager has skipped Claiming Ownership of available tasks at it has ran out Available Workers. If this happens often, consider adjusting the "xpack.task_manager.max_workers" configuration.`
    );
  }
  return [];
}

export async function awaitTaskRunResult(
  taskId: string,
  events$: Subject<TaskLifecycleEvent>,
  getLifecycle: (id: string) => Promise<TaskLifecycle>
): Promise<RunNowResult> {
  return new Promise((resolve, reject) => {
    const subscription = events$
      // listen for all events related to the current task
      .pipe(filter(({ id }: TaskLifecycleEvent) => id === taskId))
      .subscribe((taskEvent: TaskLifecycleEvent) => {
        either(
          taskEvent.event,
          (taskInstance: ConcreteTaskInstance) => {
            // resolve if the task has run sucessfully
            if (isTaskRunEvent(taskEvent)) {
              subscription.unsubscribe();
              resolve({ id: taskInstance.id });
            }
          },
          async (error: Error) => {
            // reject if any error event takes place for the requested task
            subscription.unsubscribe();
            if (isTaskRunRequestEvent(taskEvent)) {
              return reject(
                new Error(
                  `Failed to run task "${taskId}" as Task Manager is at capacity, please try again later`
                )
              );
            } else if (isTaskClaimEvent(taskEvent)) {
              reject(
                map(
                  // if the error happened in the Claim phase - we try to provide better insight
                  // into why we failed to claim by getting the task's current lifecycle status
                  await promiseResult<TaskLifecycle, Error>(getLifecycle(taskId)),
                  (taskLifecycleStatus: TaskLifecycle) => {
                    if (taskLifecycleStatus === TaskLifecycleResult.NotFound) {
                      return new Error(`Failed to run task "${taskId}" as it does not exist`);
                    } else if (
                      taskLifecycleStatus === TaskStatus.Running ||
                      taskLifecycleStatus === TaskStatus.Claiming
                    ) {
                      return new Error(`Failed to run task "${taskId}" as it is currently running`);
                    }
                    return error;
                  },
                  () => error
                )
              );
            }
            return reject(error);
          }
        );
      });
  });
}
