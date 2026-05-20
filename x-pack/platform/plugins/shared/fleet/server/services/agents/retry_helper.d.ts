import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
export declare const MAX_RETRY_COUNT = 20;
export interface RetryParams {
    pitId?: string;
    searchAfter?: SortResults;
    retryCount?: number;
    taskId?: string;
}
export declare function getRetryParams(taskType: string, retryParams: RetryParams): RetryParams;
