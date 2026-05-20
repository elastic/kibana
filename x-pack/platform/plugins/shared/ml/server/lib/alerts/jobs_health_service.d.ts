import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import type { FieldFormatsRegistryProvider } from '@kbn/ml-common-types/kibana';
import type { MlClient } from '../ml_client';
import { type DatafeedsService } from '../../models/job_service/datafeeds';
import type { GetGuards } from '../../shared_services/shared_services';
import type { AnomalyDetectionJobHealthAlertPayload, AnomalyDetectionJobsHealthAlertContext, DelayedDataPayloadResponse, JobsErrorsResponse, JobsHealthExecutorOptions, MmlTestPayloadResponse, NotStartedDatafeedResponse } from './register_jobs_monitoring_rule_type';
import type { AnnotationService } from '../../models/annotation_service/annotation';
import { type JobAuditMessagesService } from '../../models/job_audit_messages/job_audit_messages';
export interface TestResult {
    name: string;
    context: AnomalyDetectionJobsHealthAlertContext;
    payload: AnomalyDetectionJobHealthAlertPayload;
    /**
     * Indicates if the health check is successful.
     */
    isHealthy: boolean;
}
type TestsResults = TestResult[];
export declare function jobsHealthServiceProvider(mlClient: MlClient, datafeedsService: DatafeedsService, annotationService: AnnotationService, jobAuditMessagesService: JobAuditMessagesService, getFieldsFormatRegistry: FieldFormatsRegistryProvider, logger: Logger): {
    /**
     * Gets not started datafeeds for opened jobs.
     * @param jobIds
     */
    getDatafeedsReport(jobIds: string[]): Promise<NotStartedDatafeedResponse[] | void>;
    /**
     * Gets the model memory report for opened jobs.
     * @param jobIds
     */
    getMmlReport(jobIds: string[]): Promise<MmlTestPayloadResponse[]>;
    /**
     * Returns annotations about delayed data.
     *
     * @param jobs
     * @param timeInterval - Custom time interval provided by the user.
     * @param docsCount - The threshold for a number of missing documents to alert upon.
     *
     * @return {Promise<[DelayedDataResponse[], DelayedDataResponse[]]>} - Collections of annotations exceeded and not exceeded the docs threshold.
     */
    getDelayedDataReport(jobs: MlJob[], timeInterval: string | null, docsCount: number | null): Promise<[DelayedDataPayloadResponse[], DelayedDataPayloadResponse[]]>;
    /**
     * Retrieves a list of the latest errors per jobs.
     * @param jobIds List of job IDs.
     * @param previousStartedAt Time of the previous rule execution. As we intend to notify
     *                          about an error only once, limit the scope of the errors search.
     */
    getErrorsReport(jobIds: string[], previousStartedAt: Date): Promise<JobsErrorsResponse[]>;
    /**
     * Retrieves report grouped by test.
     */
    getTestsResults(executorOptions: JobsHealthExecutorOptions): Promise<TestsResults>;
};
export type JobsHealthService = ReturnType<typeof jobsHealthServiceProvider>;
export declare function getJobsHealthServiceProvider(getGuards: GetGuards): {
    jobsHealthServiceProvider(savedObjectsClient: SavedObjectsClientContract, request: KibanaRequest, logger: Logger): {
        getTestsResults: (executorOptions: JobsHealthExecutorOptions) => ReturnType<JobsHealthService["getTestsResults"]>;
    };
};
export type JobsHealthServiceProvider = ReturnType<typeof getJobsHealthServiceProvider>;
export {};
