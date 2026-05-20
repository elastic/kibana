import type { Observable } from 'rxjs';
import type { AggFieldNamePair } from '@kbn/ml-anomaly-utils';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { CategorizationAnalyzer, FieldValidationResults } from '@kbn/ml-category-validator';
import type { Dictionary } from '@kbn/ml-common-types/common';
import type { MlJobWithTimeRange, MlSummaryJobs } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { Datafeed, IndicesOptions } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { JobMessage } from '@kbn/ml-common-types/audit_message';
import type { Group } from '@kbn/ml-common-types/groups';
import type { Category } from '@kbn/ml-common-types/categories';
import type { JobsExistResponse, BulkCreateResults, ResetJobsResponse } from '@kbn/ml-common-types/job_service';
import type { ExistingJobsAndGroups } from '../job_service';
import type { JobAction } from '../../../../common/constants/job_actions';
import type { HttpService } from '../http_service';
export declare const jobsApiProvider: (httpService: HttpService) => {
    jobsSummary(jobIds: string[]): Promise<MlSummaryJobs>;
    jobIdsWithGeo(): Promise<string[]>;
    jobsWithTimerange(dateFormatTz: string): Promise<{
        jobs: MlJobWithTimeRange[];
        jobsMap: Dictionary<MlJobWithTimeRange>;
    }>;
    jobForCloning(jobId: string, retainCreatedBy?: boolean): Promise<{
        job?: Job;
        datafeed?: Datafeed;
    } | undefined>;
    jobs(jobIds: string[]): Promise<CombinedJobWithStats[]>;
    groups(): Promise<Group[]>;
    updateGroups(updatedJobs: Array<{
        jobId: string;
        groups: string[];
    }>): Promise<any>;
    forceStartDatafeeds(datafeedIds: string[], start: string, end: string): Promise<any>;
    stopDatafeeds(datafeedIds: string[], closeJobs?: boolean): Promise<any>;
    deleteJobs(jobIds: string[], deleteUserAnnotations?: boolean, deleteAlertingRules?: boolean): Promise<any>;
    closeJobs(jobIds: string[]): Promise<any>;
    resetJobs(jobIds: string[], deleteUserAnnotations?: boolean): Promise<ResetJobsResponse>;
    forceStopAndCloseJob(jobId: string): Promise<{
        success: boolean;
    }>;
    jobAuditMessages({ jobId, from, start, end, }: {
        jobId: string;
        from?: number;
        start?: string;
        end?: string;
    }): Promise<{
        messages: JobMessage[];
        notificationIndices: string[];
    }>;
    clearJobAuditMessages(jobId: string, notificationIndices: string[]): Promise<{
        success: boolean;
        latest_cleared: number;
    }>;
    blockingJobTasks(): Promise<Record<string, JobAction>>;
    jobsExist(jobIds: string[], allSpaces?: boolean): Promise<JobsExistResponse>;
    jobsExist$(jobIds: string[], allSpaces?: boolean): Observable<JobsExistResponse>;
    newJobCaps(indexPatternTitle: string, isRollup?: boolean): Promise<any>;
    newJobLineChart(indexPatternTitle: string, timeField: string, start: number, end: number, intervalMs: number, query: any, aggFieldNamePairs: AggFieldNamePair[], splitFieldName: string | null, splitFieldValue: string | null, runtimeMappings?: RuntimeMappings, indicesOptions?: IndicesOptions): Promise<any>;
    newJobPopulationsChart(indexPatternTitle: string, timeField: string, start: number, end: number, intervalMs: number, query: any, aggFieldNamePairs: AggFieldNamePair[], splitFieldName: string, runtimeMappings?: RuntimeMappings, indicesOptions?: IndicesOptions): Promise<any>;
    getAllJobAndGroupIds(): Promise<ExistingJobsAndGroups>;
    getLookBackProgress(jobId: string, start: number, end: number): Promise<{
        progress: number;
        isRunning: boolean;
        isJobClosed: boolean;
    }>;
    categorizationFieldExamples(indexPatternTitle: string, query: any, size: number, field: string, timeField: string, start: number, end: number, analyzer: CategorizationAnalyzer, runtimeMappings?: RuntimeMappings, indicesOptions?: IndicesOptions, includeExamples?: boolean): Promise<FieldValidationResults>;
    topCategories(jobId: string, count: number): Promise<{
        total: number;
        categories: Array<{
            count?: number;
            category: Category;
        }>;
    }>;
    revertModelSnapshot(jobId: string, snapshotId: string, replay: boolean, end?: number, calendarEvents?: Array<{
        start: number;
        end: number;
        description: string;
    }>): Promise<{
        success: boolean;
    }>;
    datafeedPreview(datafeedId?: string, job?: Job, datafeed?: Datafeed): Promise<unknown[]>;
    bulkCreateJobs(jobs: {
        job: Job;
        datafeed: Datafeed;
    } | Array<{
        job: Job;
        datafeed: Datafeed;
    }>): Promise<BulkCreateResults>;
};
export type JobsApiService = ReturnType<typeof jobsApiProvider>;
/**
 * Hooks for accessing {@link JobsApiService} in React components.
 */
export declare function useJobsApiService(): JobsApiService;
