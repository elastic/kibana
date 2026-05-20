import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../../services/ml_api_service';
export type JobDependencies = Array<{
    jobId: string;
    calendarIds: string[];
    filterIds: string[];
}>;
export type FiltersPerJob = Array<{
    jobId: string;
    filterIds: string[];
}>;
export declare class JobsExportService {
    private _mlApi;
    constructor(_mlApi: MlApi);
    exportAnomalyDetectionJobs(jobIds: string[]): Promise<void>;
    exportDataframeAnalyticsJobs(jobIds: string[]): Promise<void>;
    private _export;
    private _createFileName;
    getJobDependencies(jobs: Job[]): Promise<JobDependencies>;
}
