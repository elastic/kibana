import type { z } from '@kbn/zod/v4';
import { type Condition } from '@kbn/streamlang';
export declare const featureStatusSchema: z.ZodEnum<{
    active: "active";
    expired: "expired";
    stale: "stale";
}>;
export type FeatureStatus = z.infer<typeof featureStatusSchema>;
export declare const DATASET_ANALYSIS_FEATURE_TYPE: "dataset_analysis";
export declare const LOG_SAMPLES_FEATURE_TYPE: "log_samples";
export declare const LOG_PATTERNS_FEATURE_TYPE: "log_patterns";
export declare const ERROR_LOGS_FEATURE_TYPE: "error_logs";
export declare const COMPUTED_FEATURE_TYPES: readonly ["dataset_analysis", "log_samples", "log_patterns", "error_logs"];
export declare const INFERRED_FEATURE_TYPES: readonly ["entity", "infrastructure", "technology", "dependency", "schema"];
export declare const baseFeatureSchema: z.ZodObject<{
    id: z.ZodString;
    stream_name: z.ZodString;
    type: z.ZodString;
    subtype: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    properties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    confidence: z.ZodNumber;
    evidence: z.ZodOptional<z.ZodArray<z.ZodString>>;
    evidence_doc_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    filter: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type BaseFeature = z.infer<typeof baseFeatureSchema>;
export declare const identifiedFeatureSchema: z.ZodIntersection<z.ZodObject<{
    type: z.ZodString;
    id: z.ZodString;
    filter: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    properties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    description: z.ZodString;
    confidence: z.ZodNumber;
    stream_name: z.ZodString;
    evidence_doc_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    subtype: z.ZodString;
    title: z.ZodString;
    evidence: z.ZodArray<z.ZodString>;
    tags: z.ZodArray<z.ZodString>;
}, z.core.$strip>>;
export type IdentifiedFeature = z.infer<typeof identifiedFeatureSchema>;
export declare const ignoredFeatureSchema: z.ZodObject<{
    feature_id: z.ZodString;
    feature_title: z.ZodString;
    excluded_feature_id: z.ZodString;
    reason: z.ZodString;
}, z.core.$strip>;
export type IgnoredFeature = z.infer<typeof ignoredFeatureSchema>;
export declare const featureSchema: z.ZodIntersection<z.ZodObject<{
    id: z.ZodString;
    stream_name: z.ZodString;
    type: z.ZodString;
    subtype: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    properties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    confidence: z.ZodNumber;
    evidence: z.ZodOptional<z.ZodArray<z.ZodString>>;
    evidence_doc_ids: z.ZodOptional<z.ZodArray<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    filter: z.ZodOptional<z.ZodType<Condition, unknown, z.core.$ZodTypeInternals<Condition, unknown>>>;
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>, z.ZodObject<{
    uuid: z.ZodString;
    status: z.ZodEnum<{
        active: "active";
        expired: "expired";
        stale: "stale";
    }>;
    last_seen: z.ZodString;
    expires_at: z.ZodOptional<z.ZodString>;
    excluded_at: z.ZodOptional<z.ZodString>;
    run_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>>;
export type Feature = z.infer<typeof featureSchema>;
export type FeatureWithFilter = Feature & {
    filter: Condition;
};
export declare function isFeature(feature: unknown): feature is Feature;
export declare function isFeatureWithFilter(feature: unknown): feature is FeatureWithFilter;
export declare function isComputedFeature(feature: BaseFeature): boolean;
export declare function hasSameFingerprint(feature: BaseFeature, other: BaseFeature): boolean;
export declare function isDuplicateFeature(feature: BaseFeature, other: BaseFeature): boolean;
export declare function toBaseFeature(feature: Feature): BaseFeature;
export declare function mergeFeature(existing: BaseFeature, incoming: BaseFeature): BaseFeature;
