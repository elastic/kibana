import type { Observable } from 'rxjs';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { Logger, ExecutionContextStart } from '@kbn/core/server';
import type { FakeRequestEnricher } from '@kbn/core-security-server';
import type { Result } from './lib/result_type';
import type { TaskManagerConfig } from './config';
import type { TaskMarkRunning, TaskRun, TaskClaim, TaskRunRequest, TaskPollingCycle, TaskManagerStat, TaskManagerMetric, TaskManagerBackpressure } from './task_events';
import { FillPoolResult } from './lib/fill_pool';
import type { Middleware } from './lib/middleware';
import type { TaskEventLogger } from './task';
import { TaskPool } from './task_pool';
import type { TaskStore } from './task_store';
import type { ApiKeyStrategy } from './api_key_strategy';
import type { TaskTypeDictionary } from './task_type_dictionary';
import { TaskClaiming } from './queries/task_claiming';
import type { ClaimOwnershipResult } from './task_claimers';
import type { TaskPartitioner } from './lib/task_partitioner';
import type { TaskExecutionControlService } from './execution_control';
export interface ITaskEventEmitter<T> {
    get events(): Observable<T>;
}
export interface TaskPollingLifecycleOpts {
    logger: Logger;
    definitions: TaskTypeDictionary;
    taskStore: TaskStore;
    config: TaskManagerConfig;
    middleware: Middleware;
    elasticsearchAndSOAvailability$: Observable<boolean>;
    executionControlService: TaskExecutionControlService;
    executionContext: ExecutionContextStart;
    usageCounter?: UsageCounter;
    taskPartitioner: TaskPartitioner;
    startingCapacity: number;
    apiKeyStrategy: ApiKeyStrategy;
    eventLogger: TaskEventLogger;
    enrichFakeRequest?: FakeRequestEnricher;
}
export type TaskLifecycleEvent = TaskMarkRunning | TaskRun | TaskClaim | TaskRunRequest | TaskPollingCycle | TaskManagerStat | TaskManagerMetric | TaskManagerBackpressure;
/**
 * The public interface into the task manager system.
 */
export declare class TaskPollingLifecycle implements ITaskEventEmitter<TaskLifecycleEvent> {
    private definitions;
    private store;
    private taskClaiming;
    private bufferedStore;
    private readonly executionContext;
    private logger;
    private poller;
    private started;
    private stopped;
    private readonly executionControlService;
    private executionControlSubscription?;
    private backpressureSubscription?;
    pool: TaskPool;
    capacityConfiguration$: Observable<number>;
    pollIntervalConfiguration$: Observable<number>;
    private events$;
    private middleware;
    private usageCounter?;
    private config;
    private currentPollInterval;
    private apiKeyStrategy;
    private currentTmUtilization$;
    private enrichFakeRequest?;
    private eventLogger;
    /**
     * Initializes the task manager, preventing any further addition of middleware,
     * enabling the task manipulation methods, and beginning the background polling
     * mechanism.
     */
    constructor({ logger, middleware, config, elasticsearchAndSOAvailability$, executionControlService, taskStore, definitions, executionContext, usageCounter, taskPartitioner, startingCapacity, apiKeyStrategy, eventLogger, enrichFakeRequest, }: TaskPollingLifecycleOpts);
    private handleExecutionControlTransition;
    /**
     * Before the first poll, reset tasks this node still owns from a previous run
     * (e.g. after a crash) so they don't wait out their retryAt timeout.
     * Best-effort: the poller starts regardless of the outcome, and the retryAt
     * timeout remains the safety net.
     */
    private reconcileAndStartPolling;
    get events(): Observable<TaskLifecycleEvent>;
    stop(): void;
    getCurrentTasksInPool(): string[];
    private emitEvent;
    private createTaskRunnerForTask;
    private pollForWork;
    private subscribeToPoller;
}
export declare function claimAvailableTasks(taskClaiming: TaskClaiming, logger: Logger): Promise<Result<ClaimOwnershipResult, FillPoolResult>>;
