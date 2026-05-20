import type { IScopedClusterClient } from '@kbn/core/server';
import type { FieldsForHistograms } from '@kbn/ml-agg-utils';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
interface FieldData {
    fieldName: string;
    existsInDocs: boolean;
    stats?: {
        sampleCount?: number;
        count?: number;
        cardinality?: number;
    };
}
export interface Field {
    fieldName: string;
    type: string;
    cardinality: number;
}
interface Distribution {
    percentiles: any[];
    minPercentile: number;
    maxPercentile: number;
}
interface Bucket {
    doc_count: number;
}
interface NumericFieldStats {
    fieldName: string;
    count: number;
    min: number;
    max: number;
    avg: number;
    isTopValuesSampled: boolean;
    topValues: Bucket[];
    topValuesSampleSize: number;
    topValuesSamplerShardSize: number;
    median?: number;
    distribution?: Distribution;
}
interface StringFieldStats {
    fieldName: string;
    isTopValuesSampled: boolean;
    topValues: Bucket[];
    topValuesSampleSize: number;
    topValuesSamplerShardSize: number;
}
interface DateFieldStats {
    fieldName: string;
    count: number;
    earliest: number;
    latest: number;
}
interface BooleanFieldStats {
    fieldName: string;
    count: number;
    trueCount: number;
    falseCount: number;
    [key: string]: number | string;
}
interface DocumentCountStats {
    documentCounts: {
        interval: number;
        buckets: {
            [key: string]: number;
        };
    };
}
interface FieldExamples {
    fieldName: string;
    examples: any[];
}
type BatchStats = NumericFieldStats | StringFieldStats | BooleanFieldStats | DateFieldStats | DocumentCountStats | FieldExamples;
export declare class DataVisualizer {
    private _asCurrentUser;
    constructor(client: IScopedClusterClient);
    getOverallStats(indexPatternTitle: string, query: object, aggregatableFields: string[], nonAggregatableFields: string[], samplerShardSize: number, timeFieldName: string | undefined, earliestMs: number | undefined, latestMs: number | undefined, runtimeMappings?: RuntimeMappings): Promise<{
        totalCount: number;
        aggregatableExistsFields: FieldData[];
        aggregatableNotExistsFields: FieldData[];
        nonAggregatableExistsFields: FieldData[];
        nonAggregatableNotExistsFields: FieldData[];
    }>;
    getHistogramsForFields(indexPattern: string, query: any, fields: FieldsForHistograms, samplerShardSize: number, runtimeMappings?: RuntimeMappings, projectRouting?: string): Promise<any>;
    getStatsForFields(indexPatternTitle: string, query: any, fields: Field[], samplerShardSize: number, timeFieldName: string | undefined, earliestMs: number | undefined, latestMs: number | undefined, intervalMs: number | undefined, maxExamples: number, runtimeMappings: RuntimeMappings, projectRouting?: string): Promise<BatchStats[]>;
    checkAggregatableFieldsExist(indexPatternTitle: string, query: any, aggregatableFields: string[], samplerShardSize: number, timeFieldName: string | undefined, earliestMs?: number, latestMs?: number, datafeedConfig?: Datafeed, runtimeMappings?: RuntimeMappings): Promise<{
        totalCount: any;
        aggregatableExistsFields: FieldData[];
        aggregatableNotExistsFields: FieldData[];
    }>;
    checkNonAggregatableFieldExists(indexPatternTitle: string, query: any, field: string, timeFieldName: string | undefined, earliestMs: number | undefined, latestMs: number | undefined, runtimeMappings?: RuntimeMappings): Promise<boolean>;
    getDocumentCountStats(indexPatternTitle: string, query: any, timeFieldName: string | undefined, earliestMs: number | undefined, latestMs: number | undefined, intervalMs: number, runtimeMappings: RuntimeMappings, projectRouting?: string): Promise<DocumentCountStats>;
    getNumericFieldsStats(indexPatternTitle: string, query: object, fields: Field[], samplerShardSize: number, timeFieldName: string | undefined, earliestMs: number | undefined, latestMs: number | undefined, runtimeMappings?: RuntimeMappings, projectRouting?: string): Promise<NumericFieldStats[]>;
    getStringFieldsStats(indexPatternTitle: string, query: object, fields: Field[], samplerShardSize: number, timeFieldName: string | undefined, earliestMs: number | undefined, latestMs: number | undefined, runtimeMappings?: RuntimeMappings, projectRouting?: string): Promise<StringFieldStats[]>;
    getDateFieldsStats(indexPatternTitle: string, query: object, fields: Field[], samplerShardSize: number, timeFieldName: string | undefined, earliestMs: number | undefined, latestMs: number | undefined, runtimeMappings?: RuntimeMappings, projectRouting?: string): Promise<DateFieldStats[]>;
    getBooleanFieldsStats(indexPatternTitle: string, query: object, fields: Field[], samplerShardSize: number, timeFieldName: string | undefined, earliestMs: number | undefined, latestMs: number | undefined, runtimeMappings?: RuntimeMappings, projectRouting?: string): Promise<BooleanFieldStats[]>;
    getFieldExamples(indexPatternTitle: string, query: any, field: string, timeFieldName: string | undefined, earliestMs: number | undefined, latestMs: number | undefined, maxExamples: number, runtimeMappings?: RuntimeMappings, projectRouting?: string): Promise<FieldExamples>;
    processDistributionData(percentiles: Array<{
        value: number;
    }>, percentileSpacing: number, minValue: number): Distribution;
}
export {};
