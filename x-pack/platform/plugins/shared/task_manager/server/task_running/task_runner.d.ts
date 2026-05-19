import type { ExecutionContextStart, IBasePath, Logger } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type { Middleware } from '../lib/middleware';
import type { Result } from '../lib/result_type';
import type { TaskMarkRunning, TaskRun, TaskManagerStat } from '../task_events';
import type { CancelFunction, ConcreteTaskInstance, FailedRunResult, PartialConcreteTaskInstance, SuccessfulRunResult, TaskDefinition, TaskEventLogger } from '../task';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import { type TaskManagerConfig } from '../config';
import type { ApiKeyStrategy } from '../api_key_strategy';
export declare const EMPTY_RUN_RESULT: SuccessfulRunResult;
export declare const TASK_MANAGER_RUN_TRANSACTION_TYPE = "task-run";
export declare const TASK_MANAGER_TRANSACTION_TYPE = "task-manager";
export declare const TASK_MANAGER_TRANSACTION_TYPE_MARK_AS_RUNNING = "mark-task-as-running";
export interface TaskRunner {
    isExpired: boolean;
    expiration: Date;
    startedAt: Date | null;
    definition: TaskDefinition | undefined;
    /** Effective cost for this task (instance override, then definition, then Normal). */
    cost: number;
    cancel: CancelFunction;
    markTaskAsRunning: () => Promise<boolean>;
    run: () => Promise<Result<SuccessfulRunResult, FailedRunResult>>;
    id: string;
    taskExecutionId: string;
    stage: string;
    toString: () => string;
    isSameTask: (executionId: string) => boolean;
    isAdHocTaskAndOutOfAttempts: boolean;
    removeTask: () => Promise<void>;
}
export declare enum TaskRunningStage {
    PENDING = "PENDING",
    READY_TO_RUN = "READY_TO_RUN",
    RAN = "RAN"
}
export interface TaskRunning<Stage extends TaskRunningStage, Instance> {
    timestamp: Date;
    stage: Stage;
    task: Instance;
}
export interface Updatable {
    update(doc: ConcreteTaskInstance, options: {
        validate: boolean;
    }): Promise<ConcreteTaskInstance>;
    partialUpdate(partialDoc: PartialConcreteTaskInstance, options: {
        validate: boolean;
        doc: ConcreteTaskInstance;
    }): Promise<ConcreteTaskInstance>;
    remove(id: string): Promise<void>;
}
type Opts = {
    basePathService: IBasePath;
    logger: Logger;
    definitions: TaskTypeDictionary;
    instance: ConcreteTaskInstance;
    store: Updatable;
    onTaskEvent?: (event: TaskRun | TaskMarkRunning | TaskManagerStat) => void;
    defaultMaxAttempts: number;
    executionContext: ExecutionContextStart;
    usageCounter?: UsageCounter;
    config: TaskManagerConfig;
    allowReadingInvalidState: boolean;
    strategy: string;
    getPollInterval: () => number;
    apiKeyStrategy: ApiKeyStrategy;
    eventLogger: TaskEventLogger;
} & Pick<Middleware, 'beforeRun' | 'beforeMarkRunning'>;
export declare enum TaskRunResult {
    Success = "Success",
    SuccessRescheduled = "Success",
    RetryScheduled = "RetryScheduled",
    Failed = "Failed",
    Deleted = "Deleted"
}
export type ConcreteTaskInstanceWithStartedAt = ConcreteTaskInstance & {
    startedAt: Date;
};
export type PendingTask = TaskRunning<TaskRunningStage.PENDING, ConcreteTaskInstance>;
export type ReadyToRunTask = TaskRunning<TaskRunningStage.READY_TO_RUN, ConcreteTaskInstanceWithStartedAt>;
export type RanTask = TaskRunning<TaskRunningStage.RAN, ConcreteTaskInstance>;
export type TaskRunningInstance = PendingTask | ReadyToRunTask | RanTask;
/**
 * Runs a background task, ensures that errors are properly handled,
 * allows for cancellation.
 *
 * @export
 * @class TaskManagerRunner
 * @implements {TaskRunner}
 */
export declare class TaskManagerRunner implements TaskRunner {
    private task?;
    private instance;
    private definitions;
    private logger;
    private bufferedTaskStore;
    private beforeRun;
    private beforeMarkRunning;
    private onTaskEvent;
    private defaultMaxAttempts;
    private uuid;
    private readonly basePathService;
    private readonly executionContext;
    private usageCounter?;
    private config;
    private readonly taskValidator;
    private readonly claimStrategy;
    private getPollInterval;
    private apiKeyStrategy;
    private eventLogger;
    private isCancelled;
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
    constructor({ basePathService, instance, definitions, logger, store, beforeRun, beforeMarkRunning, defaultMaxAttempts, onTaskEvent, executionContext, usageCounter, config, allowReadingInvalidState, strategy, getPollInterval, apiKeyStrategy, eventLogger, }: Opts);
    /**
     * Gets the id of this task instance.
     */
    get id(): string;
    /**
     * Gets the execution id of this task instance.
     */
    get taskExecutionId(): string;
    /**
     * Test whether given execution ID identifies a different execution of this same task
     * @param id
     */
    isSameTask(executionId: string): boolean;
    /**
     * Gets the task type of this task instance.
     */
    get taskType(): string;
    /**
     * Get the stage this TaskRunner is at
     */
    get stage(): TaskRunningStage;
    /**
     * Gets the task defintion from the dictionary.
     */
    get definition(): TaskDefinition | undefined;
    /**
     *  Effective cost for this task (instance override, then definition, then Normal).
     */
    get cost(): number;
    /**
     * Gets the time at which this task will expire.
     */
    get expiration(): Date;
    get timeout(): string;
    /**
     * Gets the duration of the current task run
     */
    get startedAt(): Date | null;
    /**
     * Gets whether or not this task has run longer than its expiration setting allows.
     */
    get isExpired(): boolean;
    /**
     * Returns true whenever the task is ad hoc and has ran out of attempts. When true before
     * running a task, the task should be deleted instead of ran.
     */
    get isAdHocTaskAndOutOfAttempts(): boolean;
    /**
     * Returns a log-friendly representation of this task.
     */
    toString(): string;
    /**
     * Runs the task, handling the task result, errors, etc, rescheduling if need
     * be. NOTE: the time of applying the middleware's beforeRun is incorporated
     * into the total timeout time the task in configured with. We may decide to
     * start the timer after beforeRun resolves
     *
     * @returns {Promise<Result<SuccessfulRunResult, FailedRunResult>>}
     */
    run(): Promise<Result<SuccessfulRunResult, FailedRunResult>>;
    private validateTaskState;
    removeTask(): Promise<void>;
    /**
     * Attempts to claim exclusive rights to run the task. If the attempt fails
     * with a 409 (http conflict), we assume another Kibana instance beat us to the punch.
     *
     * @returns {Promise<boolean>}
     */
    markTaskAsRunning(): Promise<boolean>;
    /**
     * Attempts to cancel the task.
     *
     * @returns {Promise<void>}
     */
    cancel(): Promise<import("../task").AnyRunResult>;
    private validateResult;
    private releaseClaimAndIncrementAttempts;
    private shouldTryToScheduleRetry;
    private shouldUpdateExpiredTask;
    private rescheduleFailedRun;
    private processResultForRecurringTask;
    private processResultWhenDone;
    private processResult;
    private getMaxAttempts;
    private getFakeKibanaRequest;
    private updateRetryAtOnIntervalForLongRunningTasks;
    private logTaskRunEvent;
    private logTaskCancelEvent;
}
type InstanceOf<S extends TaskRunningStage, T> = T extends TaskRunning<S, infer I> ? I : never;
export declare function isPending(taskRunning: TaskRunningInstance): taskRunning is PendingTask;
export declare function asPending(task: InstanceOf<TaskRunningStage.PENDING, PendingTask>): PendingTask;
export declare function isReadyToRun(taskRunning: TaskRunningInstance): taskRunning is ReadyToRunTask;
export declare function asReadyToRun(task: InstanceOf<TaskRunningStage.READY_TO_RUN, ReadyToRunTask>): ReadyToRunTask;
export declare function asRan(task: InstanceOf<TaskRunningStage.RAN, RanTask>): RanTask;
export declare function getTaskDelayInSeconds(scheduledAt: Date): number;
export {};
