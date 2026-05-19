import type { TypeOf } from '@kbn/config-schema';
export declare const significantItem: import("@kbn/config-schema").ObjectType<{
    key: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<"keyword" | "log_pattern">;
    fieldName: import("@kbn/config-schema").Type<string>;
    fieldValue: import("@kbn/config-schema").Type<string | number>;
    doc_count: import("@kbn/config-schema").Type<number>;
    bg_count: import("@kbn/config-schema").Type<number>;
    total_doc_count: import("@kbn/config-schema").Type<number>;
    total_bg_count: import("@kbn/config-schema").Type<number>;
    score: import("@kbn/config-schema").Type<number>;
    pValue: import("@kbn/config-schema").Type<number | null>;
    normalizedScore: import("@kbn/config-schema").Type<number>;
    histogram: import("@kbn/config-schema").Type<Readonly<{} & {
        key: number;
        key_as_string: string;
        doc_count_significant_item: number;
        doc_count_overall: number;
    }>[] | undefined>;
    unique: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const aiopsLogRateAnalysisBase: import("@kbn/config-schema").ObjectType<{
    start: import("@kbn/config-schema").Type<number>;
    end: import("@kbn/config-schema").Type<number>;
    searchQuery: import("@kbn/config-schema").Type<string>;
    timeFieldName: import("@kbn/config-schema").Type<string>;
    includeFrozen: import("@kbn/config-schema").Type<boolean | undefined>;
    grouping: import("@kbn/config-schema").Type<boolean | undefined>;
    /** Analysis selection time ranges */
    baselineMin: import("@kbn/config-schema").Type<number>;
    baselineMax: import("@kbn/config-schema").Type<number>;
    deviationMin: import("@kbn/config-schema").Type<number>;
    deviationMax: import("@kbn/config-schema").Type<number>;
    /** The index to query for log rate analysis */
    index: import("@kbn/config-schema").Type<string>;
    /** Settings to override headers derived compression and flush fix */
    compressResponse: import("@kbn/config-schema").Type<boolean | undefined>;
    flushFix: import("@kbn/config-schema").Type<boolean | undefined>;
    /** Probability used for the random sampler aggregations */
    sampleProbability: import("@kbn/config-schema").Type<number | undefined>;
    projectRouting: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const aiopsLogRateAnalysisSchemaV2: import("@kbn/config-schema").Type<Readonly<{
    projectRouting?: string | undefined;
    overrides?: Readonly<{
        loaded?: number | undefined;
        significantItems?: Readonly<{
            histogram?: Readonly<{} & {
                key: number;
                key_as_string: string;
                doc_count_significant_item: number;
                doc_count_overall: number;
            }>[] | undefined;
            unique?: boolean | undefined;
        } & {
            type: "keyword" | "log_pattern";
            key: string;
            fieldName: string;
            score: number;
            doc_count: number;
            bg_count: number;
            pValue: number | null;
            fieldValue: string | number;
            total_doc_count: number;
            total_bg_count: number;
            normalizedScore: number;
        }>[] | undefined;
        remainingFieldCandidates?: string[] | undefined;
        regroupOnly?: boolean | undefined;
    } & {}> | undefined;
    grouping?: boolean | undefined;
    includeFrozen?: boolean | undefined;
    sampleProbability?: number | undefined;
    compressResponse?: boolean | undefined;
    flushFix?: boolean | undefined;
} & {
    index: string;
    start: number;
    end: number;
    timeFieldName: string;
    searchQuery: string;
    baselineMin: number;
    baselineMax: number;
    deviationMin: number;
    deviationMax: number;
}>>;
export type AiopsLogRateAnalysisSchemaV2 = TypeOf<typeof aiopsLogRateAnalysisSchemaV2>;
export type AiopsLogRateAnalysisSchemaSignificantItem = TypeOf<typeof significantItem>;
