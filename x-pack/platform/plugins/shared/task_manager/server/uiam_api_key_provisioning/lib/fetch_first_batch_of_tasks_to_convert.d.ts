import type { TaskManagerStartContract } from '../..';
import type { TaskForClassification } from './classify_task';
export interface FetchFirstBatchOfTasksOptions {
    /**
     * Task `entityId`s that already have final UIAM provisioning status
     * (return value of {@link getExcludeTasksFilter}).
     */
    excludeTaskEntityIdsWithFinalStatus: string[];
    /** Defaults to {@link FETCH_BATCH_SIZE}. */
    perPage?: number;
}
/**
 * Fetches the first page of task docs for UIAM conversion
 * (mirrors `fetchFirstBatchOfRulesToConvert` in Alerting’s provisioning layer).
 */
export declare const fetchFirstBatchOfTasksToConvert: (taskManager: TaskManagerStartContract, options: FetchFirstBatchOfTasksOptions) => Promise<{
    tasks: TaskForClassification[];
    hasMore: boolean;
}>;
