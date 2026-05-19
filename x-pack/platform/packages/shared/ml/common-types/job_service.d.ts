import type { ES_AGGREGATION } from '@kbn/ml-anomaly-utils';
import { type RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { Job } from './anomaly_detection_jobs/job';
import type { JobStats } from './anomaly_detection_jobs/job_stats';
import type { IndicesOptions } from './anomaly_detection_jobs/datafeed';
import type { ErrorType } from './errors';
export interface MlJobsResponse {
    jobs: Job[];
    count: number;
}
export interface MlJobsStatsResponse {
    jobs: JobStats[];
    count: number;
}
export interface JobsExistResponse {
    [jobId: string]: {
        exists: boolean;
        isGroup: boolean;
    };
}
export interface BucketSpanEstimatorData {
    aggTypes: Array<ES_AGGREGATION | null>;
    duration: {
        start: number;
        end: number;
    };
    fields: Array<string | null>;
    index: string;
    query?: any;
    splitField?: string;
    timeField?: string;
    runtimeMappings?: RuntimeMappings;
    indicesOptions?: IndicesOptions;
}
export interface BulkCreateResults {
    [id: string]: {
        job: {
            success: boolean;
            error?: ErrorType;
        };
        datafeed: {
            success: boolean;
            error?: ErrorType;
        };
    };
}
export interface ResetJobsResponse {
    [jobId: string]: {
        reset: boolean;
        task?: string;
        error?: ErrorType;
    };
}
export interface UpdateGroupsRequest {
    jobs: Array<{
        jobId: string;
        groups: string[];
    }>;
}
