/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { performance } from 'perf_hooks';
// Task manager uses an unconventional directory structure so the linter marks this as a violation, server files should
// be moved under task_manager/server/
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SavedObjectsClientContract, SavedObjectsSerializer } from 'src/core/server';
import { Logger } from './types';
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
  TaskInstance,
} from './task';
import { TaskPoller } from './task_poller';
import { TaskPool } from './task_pool';
import { TaskManagerRunner } from './task_runner';
import {
  FetchOpts,
  FetchResult,
  TaskStore,
  OwnershipClaimingOpts,
  ClaimOwnershipResult,
} from './task_store';
import { identifyEsError } from './lib/identify_es_error';

const VERSION_CONFLICT_STATUS = 409;

export interface TaskManagerOpts {
  logger: Logger;
  config: any;
  callWithInternalUser: any;
  savedObjectsRepository: SavedObjectsClientContract;
  serializer: SavedObjectsSerializer;
}

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
  private isStarted = false;
  private maxWorkers: number;
  private readonly pollerInterval: number;
  private definitions: TaskDictionary<TaskDefinition>;
  private store: TaskStore;
  private poller: TaskPoller<FillPoolResult>;
  private logger: Logger;
  private pool: TaskPool;
  private startQueue: Array<() => void> = [];
  private middleware = {
    beforeSave: async (saveOpts: BeforeSaveMiddlewareParams) => saveOpts,
    beforeRun: async (runOpts: RunContext) => runOpts,
    beforeMarkRunning: async (runOpts: RunContext) => runOpts,
  };

  /**
   * Initializes the task manager, preventing any further addition of middleware,
   * enabling the task manipulation methods, and beginning the background polling
   * mechanism.
   */
  constructor(opts: TaskManagerOpts) {
    this.maxWorkers = opts.config.get('xpack.task_manager.max_workers');
    this.pollerInterval = opts.config.get('xpack.task_manager.poll_interval');
    this.definitions = {};
    this.logger = opts.logger;

    const taskManagerId = opts.config.get('server.uuid');
    if (!taskManagerId) {
      this.logger.error(
        `TaskManager is unable to start as there the Kibana UUID is invalid (value of the "server.uuid" configuration is ${taskManagerId})`
      );
      throw new Error(`TaskManager is unable to start as Kibana has no valid UUID assigned to it.`);
    } else {
      this.logger.info(`TaskManager is identified by the Kibana UUID: ${taskManagerId}`);
    }

    const store = new TaskStore({
      serializer: opts.serializer,
      savedObjectsRepository: opts.savedObjectsRepository,
      callCluster: opts.callWithInternalUser,
      index: opts.config.get('xpack.task_manager.index'),
      maxAttempts: opts.config.get('xpack.task_manager.max_attempts'),
      definitions: this.definitions,
      taskManagerId: `kibana:${taskManagerId}`,
    });

    const pool = new TaskPool({
      logger: this.logger,
      maxWorkers: this.maxWorkers,
    });
    const createRunner = (instance: ConcreteTaskInstance) =>
      new TaskManagerRunner({
        logger: this.logger,
        instance,
        store,
        definitions: this.definitions,
        beforeRun: this.middleware.beforeRun,
        beforeMarkRunning: this.middleware.beforeMarkRunning,
      });
    const poller = new TaskPoller<FillPoolResult>({
      logger: this.logger,
      pollInterval: opts.config.get('xpack.task_manager.poll_interval'),
      work: (): Promise<FillPoolResult> =>
        fillPool(
          async tasks => await pool.run(tasks),
          () =>
            claimAvailableTasks(
              this.store.claimAvailableTasks.bind(this.store),
              this.pool.availableWorkers,
              this.logger
            ),
          createRunner
        ),
    });

    this.pool = pool;
    this.store = store;
    this.poller = poller;
  }

  /**
   * Starts up the task manager and starts picking up tasks.
   */
  public start() {
    this.isStarted = true;
    // Some calls are waiting until task manager is started
    this.startQueue.forEach(fn => fn());
    this.startQueue = [];
    const startPoller = async () => {
      try {
        await this.poller.start();
      } catch (err) {
        // FIXME: check the type of error to make sure it's actually an ES error
        this.logger.warn(`PollError ${err.message}`);

        // rety again to initialize store and poller, using the timing of
        // task_manager's configurable poll interval
        const retryInterval = this.pollerInterval;
        setTimeout(() => startPoller(), retryInterval);
      }
    };
    startPoller();
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
    this.poller.stop();
    this.pool.cancelRunningTasks();
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
  public async schedule(taskInstance: TaskInstance, options?: any): Promise<ConcreteTaskInstance> {
    await this.waitUntilStarted();
    const { taskInstance: modifiedTask } = await this.middleware.beforeSave({
      ...options,
      taskInstance,
    });
    const result = await this.store.schedule(modifiedTask);
    this.poller.attemptWork();
    return result;
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
    if (this.isStarted) {
      throw new Error(`Cannot ${message} after the task manager is initialized!`);
    }
  }
}

export async function claimAvailableTasks(
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
