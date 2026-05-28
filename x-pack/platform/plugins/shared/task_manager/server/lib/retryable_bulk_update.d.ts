import type { ApiKeyOptions, ConcreteTaskInstance } from '../task';
import type { TaskStore, BulkGetResult } from '../task_store';
import type { BulkUpdateTaskResult } from '../task_scheduling';
export declare const MAX_RETRIES = 2;
export interface RetryableBulkUpdateOpts {
    taskIds: string[];
    getTasks: (taskIds: string[]) => Promise<BulkGetResult>;
    filter: (task: ConcreteTaskInstance) => boolean;
    map: (task: ConcreteTaskInstance, i: number, arr: ConcreteTaskInstance[]) => ConcreteTaskInstance;
    store: TaskStore;
    validate: boolean;
    mergeAttributes?: boolean;
    options?: ApiKeyOptions;
}
export declare function retryableBulkUpdate({ taskIds, getTasks, filter, map, store, validate, mergeAttributes, options, }: RetryableBulkUpdateOpts): Promise<BulkUpdateTaskResult>;
