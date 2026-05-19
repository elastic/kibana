import type { IScopedClusterClient } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { JobsExistResponse, BulkCreateResults, ResetJobsResponse } from '@kbn/ml-common-types/job_service';
import type { JobAction } from '../../../common/constants/job_actions';
import type { MlClient } from '../../lib/ml_client';
export declare function jobsProvider(client: IScopedClusterClient, mlClient: MlClient, rulesClient?: RulesClient): {
    forceDeleteJob: (jobId: string, deleteUserAnnotations?: boolean) => Promise<void>;
    deleteJobs: (jobIds: string[], deleteUserAnnotations?: boolean, deleteAlertingRules?: boolean) => Promise<import("./error_utils").Results>;
    closeJobs: (jobIds: string[]) => Promise<import("./error_utils").Results>;
    resetJobs: (jobIds: string[], deleteUserAnnotations?: boolean) => Promise<import("./error_utils").Results | ResetJobsResponse>;
    forceStopAndCloseJob: (jobId: string) => Promise<{
        success: boolean;
    }>;
    jobsSummary: (jobIds?: string[]) => Promise<MlSummaryJob[]>;
    jobsWithTimerange: () => Promise<{
        jobs: {
            id: string;
            job_id: string;
            groups: string[];
            isRunning: boolean;
            isSingleMetricViewerJob: boolean;
            isNotSingleMetricViewerJobMessage: string | undefined;
            timeRange: {
                to?: number;
                from?: number;
            };
        }[];
        jobsMap: {
            [id: string]: string[];
        };
    }>;
    getJobForCloning: (jobId: string, retainCreatedBy?: boolean) => Promise<{
        datafeed?: Datafeed;
        job?: Job;
    }>;
    createFullJobsList: (jobIds?: string[]) => Promise<CombinedJobWithStats[]>;
    blockingJobTasks: () => Promise<{
        jobs: Record<string, JobAction>[];
    }>;
    jobsExist: (jobIds?: string[], allSpaces?: boolean) => Promise<JobsExistResponse>;
    getAllJobAndGroupIds: () => Promise<{
        jobIds: string[];
        groupIds: string[];
    }>;
    getLookBackProgress: (jobId: string, start: number, end: number) => Promise<{
        progress: number;
        isRunning: boolean;
        isJobClosed: boolean;
    }>;
    bulkCreate: (jobs: Array<{
        job: Job;
        datafeed: Datafeed;
    }>) => Promise<BulkCreateResults>;
    getJobIdsWithGeo: () => Promise<string[]>;
};
