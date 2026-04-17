/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';

/** Impact severity level for an insight (display label). */
export const insightImpactLevelSchema = z.enum(['critical', 'high', 'medium', 'low']);
export type InsightImpactLevel = z.infer<typeof insightImpactLevelSchema>;

/** Numeric impact level for sorting: 0 = critical, 1 = high, 2 = medium, 3 = low. */
export const INSIGHT_IMPACT_LEVEL_MAP: Record<InsightImpactLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const insightImpactLevelNumericSchema = z.number().int().min(0).max(3);
export type InsightImpactLevelNumeric = z.infer<typeof insightImpactLevelNumericSchema>;

export function getImpactLevel(impact: InsightImpactLevel): InsightImpactLevelNumeric {
  return INSIGHT_IMPACT_LEVEL_MAP[impact];
}

/** Evidence item supporting an insight (stream, query, event count). */
export const insightEvidenceSchema = z.object({
  stream_name: z.string(),
  query_title: z.string(),
  event_count: z.number().int().nonnegative(),
});
export type InsightEvidence = z.infer<typeof insightEvidenceSchema>;

/** User evaluation of an insight (helpful / not helpful). */
export const insightUserEvaluationSchema = z.enum(['helpful', 'not_helpful']);
export type InsightUserEvaluation = z.infer<typeof insightUserEvaluationSchema>;

/**
 * Core insight schema for LLM output (and submit_insights tool);
 * includes field descriptions for LLM guidance. Excludes id, generatedAt, userEvaluation.
 */
export const insightCoreSchema = z.object({
  title: z.string().describe('Short, actionable title summarizing the insight'),
  description: z.string().describe('Detailed explanation of what is happening and why it matters'),
  impact: insightImpactLevelSchema.describe(
    'Severity level: critical (service down), high (degraded), medium (potential issue), low (informational)'
  ),
  evidence: z
    .array(insightEvidenceSchema)
    .describe('Evidence supporting this insight from streams and queries'),
  recommendations: z
    .array(z.string())
    .describe('Actionable steps to investigate or resolve the issue'),
});
export type InsightCore = z.infer<typeof insightCoreSchema>;

/**
 * Meta fields for an insight (id, generatedAt, impactLevel, userEvaluation).
 */
export const insightMetaSchema = z.object({
  id: z.string(),
  generated_at: z.string().datetime(),
  impact_level: insightImpactLevelNumericSchema,
  user_evaluation: insightUserEvaluationSchema.optional(),
});
export type InsightMeta = z.infer<typeof insightMetaSchema>;

/**
 * Canonical insight schema (API and storage): core fields plus meta.
 * impactLevel is the numeric value for sorting (0=critical .. 3=low); impact is the display label.
 */
export const insightSchema = insightCoreSchema.and(insightMetaSchema);
export type Insight = z.infer<typeof insightSchema>;

/** Body for PUT /_insights/{id}: insight without id (id comes from path). */
export type SaveInsightBody = Omit<Insight, 'id'>;

export interface GenerateInsightsResult {
  insights: InsightCore[];
  tokens_used: ChatCompletionTokenCount;
}
