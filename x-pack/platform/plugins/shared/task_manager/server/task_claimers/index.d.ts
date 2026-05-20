import type { Subject } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskStore } from '../task_store';
import type { TaskClaim, TaskTiming } from '../task_events';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import type { TaskClaimingBatches } from '../queries/task_claiming';
import type { ConcreteTaskInstance } from '../task';
import type { TaskPartitioner } from '../lib/task_partitioner';
export interface TaskClaimerOpts {
    getCapacity: (taskType?: string | undefined) => number;
    claimOwnershipUntil: Date;
    batches: TaskClaimingBatches;
    events$: Subject<TaskClaim>;
    taskStore: TaskStore;
    definitions: TaskTypeDictionary;
    excludedTaskTypes: string[];
    taskMaxAttempts: Record<string, number>;
    logger: Logger;
    taskPartitioner: TaskPartitioner;
}
export interface ClaimOwnershipResult {
    stats: {
        tasksUpdated: number;
        tasksConflicted: number;
        tasksClaimed: number;
        tasksLeftUnclaimed?: number;
        tasksErrors?: number;
        staleTasks?: number;
    };
    docs: ConcreteTaskInstance[];
    timing?: TaskTiming;
}
export type TaskClaimerFn = (opts: TaskClaimerOpts) => Promise<ClaimOwnershipResult>;
export declare function getTaskClaimer(logger: Logger, strategy: string): TaskClaimerFn;
export declare function getEmptyClaimOwnershipResult(): ClaimOwnershipResult;
export declare function isTaskTypeExcluded(excludedTaskTypePatterns: string[], taskType: string): boolean;
export declare function getExcludedTaskTypes(definitions: TaskTypeDictionary, excludedTaskTypePatterns: string[]): string[];
