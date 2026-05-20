import type { TimeRange } from '@kbn/es-query';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
export declare function createResultsUrlForJobs(jobsList: MlSummaryJob[], resultsPage: string, userTimeRange: TimeRange): string;
export declare function createResultsUrl(jobIds: string[], start: number | string, end: number | string, resultsPage: string, mode?: string): string;
