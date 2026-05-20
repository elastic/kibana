import type { Observable } from 'rxjs';
import type { ErrorType } from '@kbn/ml-error-utils';
import type { Dictionary } from '@kbn/ml-common-types/common';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { CriteriaField } from '@kbn/ml-common-types/results';
import type { MlApi } from '../ml_api_service';
export interface ResultResponse {
    success: boolean;
    error?: ErrorType;
}
export interface MetricData extends ResultResponse {
    results: Record<string, any>;
}
export interface FieldDefinition {
    /**
     * Field name.
     */
    name: string | number;
    /**
     * Field distinct values.
     */
    values: Array<{
        value: any;
        maxRecordScore?: number;
    }>;
}
type FieldTypes = 'partition_field' | 'over_field' | 'by_field';
export type PartitionFieldsDefinition = {
    [field in FieldTypes]: FieldDefinition;
};
export interface ModelPlotOutput extends ResultResponse {
    results: Record<string, any>;
}
export interface RecordsForCriteria extends ResultResponse {
    records: any[];
}
export interface ScheduledEventsByBucket extends ResultResponse {
    events: Record<string, any>;
}
export declare function resultsServiceRxProvider(mlApi: MlApi): {
    getMetricData(index: string, entityFields: any[], query: object | undefined, metricFunction: string | null, metricFieldName: string | undefined, summaryCountFieldName: string | undefined, timeFieldName: string, earliestMs: number, latestMs: number, intervalMs: number, datafeedConfig?: Datafeed): Observable<MetricData>;
    getModelPlotOutput(jobId: string, detectorIndex: number, criteriaFields: CriteriaField[], earliestMs: number, latestMs: number, intervalMs: number, aggType?: {
        min: any;
        max: any;
    }): Observable<ModelPlotOutput>;
    getRecordsForCriteria(jobIds: string[], criteriaFields: CriteriaField[], threshold: any, earliestMs: number | null, latestMs: number | null, maxResults: number | undefined, functionDescription?: string): Observable<RecordsForCriteria>;
    getScheduledEventsByBucket(jobIds: string[], earliestMs: number, latestMs: number, intervalMs: number, maxJobs: number, maxEvents: number): Observable<ScheduledEventsByBucket>;
    fetchPartitionFieldsValues(jobId: JobId, searchTerm: Dictionary<string>, criteriaFields: Array<{
        fieldName: string;
        fieldValue: any;
    }>, earliestMs: number, latestMs: number): Observable<PartitionFieldsDefinition>;
};
export {};
