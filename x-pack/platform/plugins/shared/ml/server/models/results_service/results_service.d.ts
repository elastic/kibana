import type { IScopedClusterClient } from '@kbn/core/server';
import { type MlAnomaliesTableRecord, type MlAnomalyCategorizerStatsDoc, type MlAnomalyRecordDoc, ML_JOB_ID, ML_PARTITION_FIELD_VALUE } from '@kbn/ml-anomaly-utils';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { CriteriaField, Influencer } from '@kbn/ml-anomaly-utils';
import type { GetStoppedPartitionResult, GetDatafeedResultsChartDataResult, DatafeedResultsChartDataParams } from '@kbn/ml-common-types/results';
import type { MlClient } from '../../lib/ml_client';
/**
 * Extracts typical and actual values from the anomaly record.
 * @param source
 */
export declare function getTypicalAndActualValues(source: MlAnomalyRecordDoc): {
    actual?: number[];
    typical?: number[];
};
export declare function resultsServiceProvider(mlClient: MlClient, client?: IScopedClusterClient): {
    getAnomaliesTableData: (jobIds: string[], criteriaFields: CriteriaField[], influencers: Influencer[], aggregationInterval: string, threshold: SeverityThreshold[], earliestMs: number, latestMs: number, dateFormatTz: string, maxRecords?: number, maxExamples?: number, influencersFilterQuery?: any, functionDescription?: string) => Promise<{
        anomalies: MlAnomaliesTableRecord[];
        interval: string;
        examplesByJobId?: {
            [key: string]: any;
        };
    }>;
    getCategoryDefinition: (jobId: string, categoryId: string) => Promise<{
        categoryId: string;
        terms: null;
        regex: null;
        examples: never[];
    }>;
    getCategoryExamples: (jobId: string, categoryIds: any, maxExamples: number) => Promise<{
        [key: string]: any;
    }>;
    getLatestBucketTimestampByJob: (jobIds?: string[]) => Promise<{
        [key: string]: number | undefined;
    }>;
    getMaxAnomalyScore: (jobIds: string[] | undefined, earliestMs: number, latestMs: number) => Promise<{
        maxScore: any;
    }>;
    getPartitionFieldsValues: (jobId: string, searchTerm: {
        partition_field?: string | undefined;
        over_field?: string | undefined;
        by_field?: string | undefined;
    } | undefined, criteriaFields: CriteriaField[], earliestMs: number, latestMs: number, fieldsConfig?: import("../../routes/schemas/results_service_schema").FieldsConfig) => Promise<import("./get_partition_fields_values").PartitionFieldValueResponse | {}>;
    getCategorizerStats: (jobId: string, partitionByValue?: string) => Promise<(MlAnomalyCategorizerStatsDoc | undefined)[]>;
    getCategoryStoppedPartitions: (jobIds: string[], fieldToBucket?: typeof ML_JOB_ID | typeof ML_PARTITION_FIELD_VALUE) => Promise<GetStoppedPartitionResult>;
    getDatafeedResultsChartData: ({ jobId, start, end, }: DatafeedResultsChartDataParams) => Promise<GetDatafeedResultsChartDataResult>;
    getAnomalyChartsData: (options: {
        jobIds: string[];
        influencers: import("@kbn/ml-anomaly-utils").MlEntityField[];
        threshold: SeverityThreshold[];
        earliestMs: number;
        latestMs: number;
        maxResults: number;
        influencersFilterQuery?: import("@kbn/ml-anomaly-utils").InfluencersFilterQuery;
        numberOfPoints: number;
        timeBounds: {
            min?: number;
            max?: number;
        };
    }) => Promise<import("@kbn/ml-common-types/results").ExplorerChartsData | undefined>;
    getRecordsForCriteria: (jobIds: string[], criteriaFields: CriteriaField[], threshold: number, earliestMs: number | null, latestMs: number | null, interval: string, functionDescription?: string) => Promise<import("@kbn/ml-common-types/results").RecordsForCriteria>;
};
