import { z } from '@kbn/zod/v4';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
/** Impact severity level for an insight (display label). */
export declare const insightImpactLevelSchema: z.ZodEnum<{
    low: "low";
    medium: "medium";
    high: "high";
    critical: "critical";
}>;
export type InsightImpactLevel = z.infer<typeof insightImpactLevelSchema>;
/** Numeric impact level for sorting: 0 = critical, 1 = high, 2 = medium, 3 = low. */
export declare const INSIGHT_IMPACT_LEVEL_MAP: Record<InsightImpactLevel, number>;
export declare const insightImpactLevelNumericSchema: z.ZodNumber;
export type InsightImpactLevelNumeric = z.infer<typeof insightImpactLevelNumericSchema>;
export declare function getImpactLevel(impact: InsightImpactLevel): InsightImpactLevelNumeric;
/** Evidence item supporting an insight (stream, query, event count). */
export declare const insightEvidenceSchema: z.ZodObject<{
    stream_name: z.ZodString;
    query_title: z.ZodString;
    event_count: z.ZodNumber;
}, z.core.$strip>;
export type InsightEvidence = z.infer<typeof insightEvidenceSchema>;
/** User evaluation of an insight (helpful / not helpful). */
export declare const insightUserEvaluationSchema: z.ZodEnum<{
    helpful: "helpful";
    not_helpful: "not_helpful";
}>;
export type InsightUserEvaluation = z.infer<typeof insightUserEvaluationSchema>;
/**
 * Core insight schema for LLM output (and submit_insights tool);
 * includes field descriptions for LLM guidance. Excludes id, generatedAt, userEvaluation.
 */
export declare const insightCoreSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    impact: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
        critical: "critical";
    }>;
    evidence: z.ZodArray<z.ZodObject<{
        stream_name: z.ZodString;
        query_title: z.ZodString;
        event_count: z.ZodNumber;
    }, z.core.$strip>>;
    recommendations: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type InsightCore = z.infer<typeof insightCoreSchema>;
/**
 * Meta fields for an insight (id, generatedAt, impactLevel, userEvaluation).
 */
export declare const insightMetaSchema: z.ZodObject<{
    id: z.ZodString;
    generated_at: z.ZodString;
    impact_level: z.ZodNumber;
    user_evaluation: z.ZodOptional<z.ZodEnum<{
        helpful: "helpful";
        not_helpful: "not_helpful";
    }>>;
}, z.core.$strip>;
export type InsightMeta = z.infer<typeof insightMetaSchema>;
/**
 * Canonical insight schema (API and storage): core fields plus meta.
 * impactLevel is the numeric value for sorting (0=critical .. 3=low); impact is the display label.
 */
export declare const insightSchema: z.ZodIntersection<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    impact: z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
        critical: "critical";
    }>;
    evidence: z.ZodArray<z.ZodObject<{
        stream_name: z.ZodString;
        query_title: z.ZodString;
        event_count: z.ZodNumber;
    }, z.core.$strip>>;
    recommendations: z.ZodArray<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    generated_at: z.ZodString;
    impact_level: z.ZodNumber;
    user_evaluation: z.ZodOptional<z.ZodEnum<{
        helpful: "helpful";
        not_helpful: "not_helpful";
    }>>;
}, z.core.$strip>>;
export type Insight = z.infer<typeof insightSchema>;
/** Body for PUT /_insights/{id}: insight without id (id comes from path). */
export type SaveInsightBody = Omit<Insight, 'id'>;
export interface GenerateInsightsResult {
    insights: InsightCore[];
    tokens_used: ChatCompletionTokenCount;
}
