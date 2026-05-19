import type { IScopedClusterClient } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { MlClient } from '../../lib/ml_client';
export declare function jobServiceProvider(client: IScopedClusterClient, mlClient: MlClient, rulesClient?: RulesClient): {
    revertModelSnapshot: (jobId: string, snapshotId: string, replay: boolean, end?: number, deleteInterveningResults?: boolean, calendarEvents?: Array<{
        start: number;
        end: number;
        description: string;
    }>) => Promise<{
        success: boolean;
    }>;
    topCategories: (jobId: string, numberOfCategories: number) => Promise<{
        total: number;
        categories: {
            category: import("@kbn/ml-common-types/categories").Category;
        }[];
    }>;
    newJobLineChart: (indexPatternTitle: string, timeField: string, start: number, end: number, intervalMs: number, query: object, aggFieldNamePairs: import("@kbn/ml-anomaly-utils").AggFieldNamePair[], splitFieldName: string | null, splitFieldValue: string | null, runtimeMappings: import("@kbn/ml-runtime-field-utils").RuntimeMappings | undefined, indicesOptions: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").IndicesOptions | undefined) => Promise<import("./new_job/line_chart").ProcessedResults>;
    newJobPopulationChart: (indexPatternTitle: string, timeField: string, start: number, end: number, intervalMs: number, query: object, aggFieldNamePairs: import("@kbn/ml-anomaly-utils").AggFieldNamePair[], splitFieldName: string | null, runtimeMappings: import("@kbn/ml-runtime-field-utils").RuntimeMappings | undefined, indicesOptions: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").IndicesOptions | undefined) => Promise<import("./new_job/population_chart").ProcessedResults>;
    newJobCaps: (indexPattern: string, isRollup: boolean | undefined, dataViewsService: import("@kbn/data-views-plugin/common").DataViewsService) => Promise<import("@kbn/ml-anomaly-utils").NewJobCapsResponse>;
    getAllGroups: () => Promise<import("@kbn/ml-common-types/groups").Group[]>;
    updateGroups: (jobs: import("@kbn/ml-common-types/job_service").UpdateGroupsRequest["jobs"]) => Promise<import("./groups").Results>;
    forceDeleteJob: (jobId: string, deleteUserAnnotations?: boolean) => Promise<void>;
    deleteJobs: (jobIds: string[], deleteUserAnnotations?: boolean, deleteAlertingRules?: boolean) => Promise<import("./error_utils").Results>;
    closeJobs: (jobIds: string[]) => Promise<import("./error_utils").Results>;
    resetJobs: (jobIds: string[], deleteUserAnnotations?: boolean) => Promise<import("./error_utils").Results | import("@kbn/ml-common-types/job_service").ResetJobsResponse>;
    forceStopAndCloseJob: (jobId: string) => Promise<{
        success: boolean;
    }>;
    jobsSummary: (jobIds?: string[]) => Promise<import("@kbn/ml-common-types/anomaly_detection_jobs/summary_job").MlSummaryJob[]>;
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
        datafeed?: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed;
        job?: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job;
    }>;
    createFullJobsList: (jobIds?: string[]) => Promise<import("@kbn/ml-common-types/anomaly_detection_jobs/combined_job").CombinedJobWithStats[]>;
    blockingJobTasks: () => Promise<{
        jobs: Record<string, import("../../../common/constants/job_actions").JobAction>[];
    }>;
    jobsExist: (jobIds?: string[], allSpaces?: boolean) => Promise<import("@kbn/ml-common-types/job_service").JobsExistResponse>;
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
        job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job;
        datafeed: import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed;
    }>) => Promise<import("@kbn/ml-common-types/job_service").BulkCreateResults>;
    getJobIdsWithGeo: () => Promise<string[]>;
    forceStartDatafeeds: (datafeedIds: string[], start?: number, end?: number) => Promise<import("./error_utils").Results | import("./datafeeds").Results>;
    stopDatafeeds: (datafeedIds: string[], closeJobs?: boolean) => Promise<import("./error_utils").Results | import("./datafeeds").Results>;
    forceDeleteDatafeed: (datafeedId: string) => Promise<import("@elastic/elasticsearch/lib/api/types").AcknowledgedResponseBase>;
    getDatafeedIdsByJobId: () => Promise<{
        [id: string]: string;
    }>;
    getJobIdsByDatafeedId: () => Promise<{
        [id: string]: string;
    }>;
    getDatafeedByJobId: {
        (jobId: string[], excludeGenerated?: boolean): Promise<import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed[] | undefined>;
        (jobId: string, excludeGenerated?: boolean): Promise<import("@kbn/ml-common-types/anomaly_detection_jobs/datafeed").Datafeed | undefined>;
    };
};
