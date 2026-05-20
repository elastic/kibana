import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { JobType } from '@kbn/ml-common-types/saved_objects';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { Filter } from '@kbn/ml-common-types/filters';
import type { MlApi } from '../../../services/ml_api_service';
export interface ImportedAdJob {
    job: Job;
    datafeed: Datafeed;
}
export interface JobIdObject {
    jobId: string;
    originalId: string;
    jobIdValid: boolean;
    jobIdInvalidMessage: string;
    jobIdValidated: boolean;
    destIndex?: string;
    originalDestIndex?: string;
    destIndexValid: boolean;
    destIndexInvalidMessage: string;
    destIndexValidated: boolean;
    datafeedInvalid?: boolean;
    datafeedWarningMessage?: string;
}
export interface SourceIndexError {
    index: string | undefined;
    error: string;
}
export interface SkippedJobs {
    jobId: string;
    missingFilters?: string[];
    sourceIndicesErrors?: SourceIndexError[];
}
export interface DatafeedValidationResult {
    jobId: string;
    hasWarning: boolean;
    warningMessage?: string;
}
export declare class JobImportService {
    private readonly esSearch;
    private readonly validateDatafeedPreview;
    private readonly getFilters;
    constructor(esSearch: MlApi['esSearch'], validateDatafeedPreview: MlApi['validateDatafeedPreview'], getFilters: () => Promise<Filter[]>);
    private _readFile;
    readJobConfigs(file: File): Promise<{
        jobs: ImportedAdJob[] | DataFrameAnalyticsConfig[];
        jobIds: string[];
        jobType: JobType | null;
    }>;
    renameAdJobs(jobIds: JobIdObject[], jobs: ImportedAdJob[]): ImportedAdJob[];
    private validateJobSourceIndices;
    private validateSingleIndex;
    renameDfaJobs(jobIds: JobIdObject[], jobs: DataFrameAnalyticsConfig[]): DataFrameAnalyticsConfig[];
    validateJobs(jobs: ImportedAdJob[] | DataFrameAnalyticsConfig[], type: JobType): Promise<{
        jobs: {
            jobId: string;
            destIndex?: string;
        }[];
        skippedJobs: SkippedJobs[];
        datafeedValidations: Map<string, DatafeedValidationResult>;
    }>;
    private validateDatafeeds;
}
