import type { TypeOf } from '@kbn/config-schema';
import { significantItem } from './schema_v2';
export declare const aiopsLogRateAnalysisSchemaV3: import("@kbn/config-schema").Type<Readonly<{
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
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
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
export type AiopsLogRateAnalysisSchemaV3 = TypeOf<typeof aiopsLogRateAnalysisSchemaV3>;
export type AiopsLogRateAnalysisSchemaSignificantItem = TypeOf<typeof significantItem>;
