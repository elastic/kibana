import type { TypeOf } from '@kbn/config-schema';
export declare const anomaliesTableDataSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    criteriaFields: import("@kbn/config-schema").Type<Readonly<{
        fieldType?: string | undefined;
        fieldValue?: any;
    } & {
        fieldName: string;
    }>[]>;
    influencers: import("@kbn/config-schema").Type<(Readonly<{
        fieldValue?: any;
    } & {
        fieldName: string;
    }> | undefined)[]>;
    aggregationInterval: import("@kbn/config-schema").Type<string>;
    threshold: import("@kbn/config-schema").Type<Readonly<{
        max?: number | undefined;
    } & {
        min: number;
    }>[]>;
    earliestMs: import("@kbn/config-schema").Type<number>;
    latestMs: import("@kbn/config-schema").Type<number>;
    dateFormatTz: import("@kbn/config-schema").Type<string>;
    maxRecords: import("@kbn/config-schema").Type<number>;
    maxExamples: import("@kbn/config-schema").Type<number | undefined>;
    influencersFilterQuery: import("@kbn/config-schema").Type<any>;
    functionDescription: import("@kbn/config-schema").Type<string | null | undefined>;
}>;
export declare const categoryDefinitionSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string | undefined>;
    categoryId: import("@kbn/config-schema").Type<string>;
}>;
export declare const maxAnomalyScoreSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    earliestMs: import("@kbn/config-schema").Type<number | undefined>;
    latestMs: import("@kbn/config-schema").Type<number | undefined>;
}>;
export declare const categoryExamplesSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
    categoryIds: import("@kbn/config-schema").Type<string[]>;
    maxExamples: import("@kbn/config-schema").Type<number>;
}>;
export declare const anomalySearchSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    query: import("@kbn/config-schema").AnyType;
}>;
declare const fieldConfig: import("@kbn/config-schema").Type<Readonly<{
    value?: string | undefined;
    applyTimeRange?: boolean | undefined;
    anomalousOnly?: boolean | undefined;
} & {
    sort: Readonly<{
        order?: string | undefined;
    } & {
        by: string;
    }>;
}> | undefined>;
export declare const partitionFieldValuesSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
    searchTerm: import("@kbn/config-schema").Type<any>;
    criteriaFields: import("@kbn/config-schema").Type<Readonly<{
        fieldType?: string | undefined;
        fieldValue?: any;
    } & {
        fieldName: string;
    }>[]>;
    earliestMs: import("@kbn/config-schema").Type<number>;
    latestMs: import("@kbn/config-schema").Type<number>;
    fieldsConfig: import("@kbn/config-schema").Type<Readonly<{
        partition_field?: Readonly<{
            value?: string | undefined;
            applyTimeRange?: boolean | undefined;
            anomalousOnly?: boolean | undefined;
        } & {
            sort: Readonly<{
                order?: string | undefined;
            } & {
                by: string;
            }>;
        }> | undefined;
        over_field?: Readonly<{
            value?: string | undefined;
            applyTimeRange?: boolean | undefined;
            anomalousOnly?: boolean | undefined;
        } & {
            sort: Readonly<{
                order?: string | undefined;
            } & {
                by: string;
            }>;
        }> | undefined;
        by_field?: Readonly<{
            value?: string | undefined;
            applyTimeRange?: boolean | undefined;
            anomalousOnly?: boolean | undefined;
        } & {
            sort: Readonly<{
                order?: string | undefined;
            } & {
                by: string;
            }>;
        }> | undefined;
    } & {}> | undefined>;
}>;
export type FieldsConfig = TypeOf<typeof partitionFieldValuesSchema>['fieldsConfig'];
export type FieldConfig = TypeOf<typeof fieldConfig>;
export declare const getCategorizerStatsSchema: import("@kbn/config-schema").ObjectType<{
    partitionByValue: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const getCategorizerStoppedPartitionsSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    fieldToBucket: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const getDatafeedResultsChartDataSchema: import("@kbn/config-schema").ObjectType<{
    jobId: import("@kbn/config-schema").Type<string>;
    start: import("@kbn/config-schema").Type<number>;
    end: import("@kbn/config-schema").Type<number>;
}>;
export declare const getAnomalyChartsSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    influencers: import("@kbn/config-schema").Type<any[]>;
    threshold: import("@kbn/config-schema").Type<Readonly<{
        max?: number | undefined;
    } & {
        min: number;
    }>[]>;
    earliestMs: import("@kbn/config-schema").Type<number>;
    latestMs: import("@kbn/config-schema").Type<number>;
    maxResults: import("@kbn/config-schema").Type<number>;
    influencersFilterQuery: import("@kbn/config-schema").Type<any>;
    numberOfPoints: import("@kbn/config-schema").Type<number>;
    timeBounds: import("@kbn/config-schema").ObjectType<{
        min: import("@kbn/config-schema").Type<number | undefined>;
        max: import("@kbn/config-schema").Type<number | undefined>;
    }>;
}>;
export declare const getAnomalyRecordsSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    threshold: import("@kbn/config-schema").Type<number>;
    earliestMs: import("@kbn/config-schema").Type<number>;
    latestMs: import("@kbn/config-schema").Type<number>;
    criteriaFields: import("@kbn/config-schema").Type<any[]>;
    interval: import("@kbn/config-schema").Type<string>;
    functionDescription: import("@kbn/config-schema").Type<string | null | undefined>;
}>;
export declare const getTopInfluencersSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    earliestMs: import("@kbn/config-schema").Type<number>;
    latestMs: import("@kbn/config-schema").Type<number>;
    maxFieldValues: import("@kbn/config-schema").Type<number | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    page: import("@kbn/config-schema").Type<number | undefined>;
    influencers: import("@kbn/config-schema").Type<Readonly<{} & {
        fieldName: string;
        fieldValue: string;
    }>[] | undefined>;
    influencersFilterQuery: import("@kbn/config-schema").Type<any>;
}>;
export declare const getScoresByBucketSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    earliestMs: import("@kbn/config-schema").Type<number>;
    latestMs: import("@kbn/config-schema").Type<number>;
    intervalMs: import("@kbn/config-schema").Type<number>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    fromPage: import("@kbn/config-schema").Type<number | undefined>;
    swimLaneSeverity: import("@kbn/config-schema").Type<Readonly<{
        max?: number | undefined;
    } & {
        min: number;
    }>[] | undefined>;
}>;
export declare const getInfluencerValueMaxScoreByTimeSchema: import("@kbn/config-schema").ObjectType<{
    jobIds: import("@kbn/config-schema").Type<string[]>;
    influencerFieldName: import("@kbn/config-schema").Type<string>;
    influencerFieldValues: import("@kbn/config-schema").Type<string[] | undefined>;
    earliestMs: import("@kbn/config-schema").Type<number>;
    latestMs: import("@kbn/config-schema").Type<number>;
    intervalMs: import("@kbn/config-schema").Type<number>;
    maxResults: import("@kbn/config-schema").Type<number | undefined>;
    perPage: import("@kbn/config-schema").Type<number | undefined>;
    fromPage: import("@kbn/config-schema").Type<number | undefined>;
    influencersFilterQuery: import("@kbn/config-schema").Type<any>;
    swimLaneSeverity: import("@kbn/config-schema").Type<Readonly<{
        max?: number | undefined;
    } & {
        min: number;
    }>[] | undefined>;
}>;
export {};
