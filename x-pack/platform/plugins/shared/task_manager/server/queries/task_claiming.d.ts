import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { Result } from '../lib/result_type';
import type { ConcreteTaskInstance } from '../task';
import type { TaskClaim } from '../task_events';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskStore, UpdateByQueryResult } from '../task_store';
import { FillPoolResult } from '../lib/fill_pool';
import type { ClaimOwnershipResult } from '../task_claimers';
import type { TaskPartitioner } from '../lib/task_partitioner';
export type { ClaimOwnershipResult } from '../task_claimers';
export interface TaskClaimingOpts {
    logger: Logger;
    strategy: string;
    definitions: TaskTypeDictionary;
    taskStore: TaskStore;
    maxAttempts: number;
    excludedTaskTypes: string[];
    getAvailableCapacity: (taskType?: string) => number;
    taskPartitioner: TaskPartitioner;
}
export interface OwnershipClaimingOpts {
    claimOwnershipUntil: Date;
    size: number;
    taskTypes: Set<string>;
}
export type IncrementalOwnershipClaimingOpts = OwnershipClaimingOpts & {
    precedingQueryResult: UpdateByQueryResult;
};
export type IncrementalOwnershipClaimingReduction = (opts: IncrementalOwnershipClaimingOpts) => Promise<UpdateByQueryResult>;
export interface FetchResult {
    docs: ConcreteTaskInstance[];
}
export declare function isClaimOwnershipResult(result: unknown): result is ClaimOwnershipResult;
export declare enum BatchConcurrency {
    Unlimited = 0,
    Limited = 1
}
export type TaskClaimingBatches = Array<UnlimitedBatch | LimitedBatch>;
export interface TaskClaimingBatch<Concurrency extends BatchConcurrency, TaskType> {
    concurrency: Concurrency;
    tasksTypes: TaskType;
}
export type UnlimitedBatch = TaskClaimingBatch<BatchConcurrency.Unlimited, Set<string>>;
export type LimitedBatch = TaskClaimingBatch<BatchConcurrency.Limited, string>;
export declare const TASK_MANAGER_MARK_AS_CLAIMED = "mark-available-tasks-as-claimed";
export declare class TaskClaiming {
    readonly errors$: Subject<Error>;
    readonly maxAttempts: number;
    private definitions;
    private events$;
    private taskStore;
    private getAvailableCapacity;
    private logger;
    private readonly taskClaimingBatchesByType;
    private readonly taskMaxAttempts;
    private readonly excludedTaskTypes;
    private readonly taskClaimer;
    private readonly taskPartitioner;
    /**
     * Constructs a new TaskStore.
     * @param {TaskClaimingOpts} opts
     * @prop {number} maxAttempts - The maximum number of attempts before a task will be abandoned
     * @prop {TaskDefinition} definition - The definition of the task being run
     */
    constructor(opts: TaskClaimingOpts);
    private partitionIntoClaimingBatches;
    private normalizeMaxAttempts;
    private claimingBatchIndex;
    private getClaimingBatches;
    get events(): Observable<TaskClaim>;
    claimAvailableTasksIfCapacityIsAvailable(claimingOptions: Omit<OwnershipClaimingOpts, 'size' | 'taskTypes'>): Promise<Result<ClaimOwnershipResult, FillPoolResult>>;
}
export declare function isLimited(batch: TaskClaimingBatch<BatchConcurrency.Limited | BatchConcurrency.Unlimited, unknown>): batch is LimitedBatch;
export declare function asLimited(tasksType: string): LimitedBatch;
export declare function asUnlimited(tasksTypes: Set<string>): UnlimitedBatch;
