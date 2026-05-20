import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import type { MlEntityField, ML_JOB_ID, ML_PARTITION_FIELD_VALUE } from '@kbn/ml-anomaly-utils';
import { type InfluencersFilterQuery, type MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { GetStoppedPartitionResult, GetDatafeedResultsChartDataResult, GetAnomaliesTableDataResult, ViewByResponse } from '@kbn/ml-common-types/results';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { PartitionFieldsConfig } from '@kbn/ml-common-types/storage';
import type { ExplorerChartsData, GetTopInfluencersRequest, InfluencersByFieldResponse } from '@kbn/ml-common-types/results';
import type { CriteriaField } from '@kbn/ml-common-types/results';
import type { HttpService } from '../http_service';
import type { PartitionFieldsDefinition } from '../results_service/result_service_rx';
export interface CategoryDefinition {
    categoryId: number;
    terms: string;
    regex: string;
    examples: string[];
}
export declare const resultsApiProvider: (httpService: HttpService) => {
    getAnomaliesTableData(jobIds: string[], criteriaFields: string[], influencers: MlEntityField[], aggregationInterval: string, threshold: SeverityThreshold[], earliestMs: number, latestMs: number, dateFormatTz: string, maxRecords: number, maxExamples?: number, influencersFilterQuery?: any, functionDescription?: string): import("rxjs").Observable<GetAnomaliesTableDataResult>;
    getMaxAnomalyScore(jobIds: string[], earliestMs: number, latestMs: number): Promise<any>;
    getCategoryDefinition(jobId: string, categoryId: string): Promise<CategoryDefinition>;
    getCategoryExamples(jobId: string, categoryIds: string[], maxExamples: number): Promise<any>;
    fetchPartitionFieldsValues(jobId: JobId, searchTerm: Record<string, string>, criteriaFields: Array<{
        fieldName: string;
        fieldValue: any;
    }>, earliestMs: number, latestMs: number, fieldsConfig?: PartitionFieldsConfig): import("rxjs").Observable<PartitionFieldsDefinition>;
    anomalySearch(query: ESSearchRequest, jobIds: string[]): Promise<ESSearchResponse<MlAnomalyRecordDoc>>;
    anomalySearch$(query: ESSearchRequest, jobIds: string[]): import("rxjs").Observable<ESSearchResponse<MlAnomalyRecordDoc>>;
    getCategoryStoppedPartitions(jobIds: string[], fieldToBucket?: typeof ML_JOB_ID | typeof ML_PARTITION_FIELD_VALUE): Promise<GetStoppedPartitionResult>;
    getDatafeedResultChartData(jobId: string, start: number, end: number): Promise<GetDatafeedResultsChartDataResult>;
    getAnomalyCharts$(jobIds: string[], influencers: MlEntityField[], threshold: SeverityThreshold[], earliestMs: number, latestMs: number, timeBounds: {
        min?: number;
        max?: number;
    }, maxResults: number, numberOfPoints: number, influencersFilterQuery?: InfluencersFilterQuery): import("rxjs").Observable<ExplorerChartsData>;
    getAnomalyRecords$(jobIds: string[], criteriaFields: CriteriaField[], severity: number, earliestMs: number | null, latestMs: number | null, interval: string, functionDescription?: string): import("rxjs").Observable<{
        success: boolean;
        records: MlAnomalyRecordDoc[];
    }>;
    getTopInfluencers(payload: GetTopInfluencersRequest): Promise<InfluencersByFieldResponse>;
    getScoresByBucket(payload: {
        jobIds: string[];
        earliestMs: number;
        latestMs: number;
        intervalMs: number;
        perPage?: number;
        fromPage?: number;
        swimLaneSeverity?: Array<{
            min: number;
            max?: number;
        }>;
    }): Promise<ViewByResponse>;
    getInfluencerValueMaxScoreByTime(payload: {
        jobIds: string[];
        influencerFieldName: string;
        influencerFieldValues?: string[];
        earliestMs: number;
        latestMs: number;
        intervalMs: number;
        maxResults?: number;
        perPage?: number;
        fromPage?: number;
        influencersFilterQuery?: unknown;
        swimLaneSeverity?: Array<{
            min: number;
            max?: number;
        }>;
    }): Promise<ViewByResponse>;
};
export type ResultsApiService = ReturnType<typeof resultsApiProvider>;
/**
 * Hooks for accessing {@link ResultsApiService} in React components.
 */
export declare function useResultsApiService(): ResultsApiService;
