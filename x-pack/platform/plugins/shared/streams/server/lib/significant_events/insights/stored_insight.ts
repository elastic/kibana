/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  INSIGHT_ID,
  INSIGHT_TITLE,
  INSIGHT_DESCRIPTION,
  INSIGHT_IMPACT,
  INSIGHT_EVIDENCE,
  INSIGHT_RECOMMENDATIONS,
} from './fields';

export type InsightImpactLevel = 'critical' | 'high' | 'medium' | 'low';

export interface InsightEvidence {
  streamName: string;
  queryTitle: string;
  featureName?: string;
  eventCount: number;
}

export interface StoredInsight {
  [INSIGHT_ID]: string;
  [INSIGHT_TITLE]: string;
  [INSIGHT_DESCRIPTION]: string;
  [INSIGHT_IMPACT]: InsightImpactLevel;
  [INSIGHT_EVIDENCE]: InsightEvidence[];
  [INSIGHT_RECOMMENDATIONS]: string[];
}

export const insightImpactLevelSchema = z.enum(['critical', 'high', 'medium', 'low']);

export const insightEvidenceSchema = z.object({
  streamName: z.string(),
  queryTitle: z.string(),
  featureName: z.string().optional(),
  eventCount: z.number(),
});

export const storedInsightSchema: z.Schema<StoredInsight> = z.object({
  [INSIGHT_ID]: z.string(),
  [INSIGHT_TITLE]: z.string(),
  [INSIGHT_DESCRIPTION]: z.string(),
  [INSIGHT_IMPACT]: insightImpactLevelSchema,
  [INSIGHT_EVIDENCE]: z.array(insightEvidenceSchema),
  [INSIGHT_RECOMMENDATIONS]: z.array(z.string()),
});

/**
 * Domain type for insights (returned by API)
 */
export interface PersistedInsight {
  id: string;
  title: string;
  description: string;
  impact: InsightImpactLevel;
  evidence: InsightEvidence[];
  recommendations: string[];
}

/**
 * Input type for creating/updating insights
 */
export interface InsightInput {
  title: string;
  description: string;
  impact: InsightImpactLevel;
  evidence: InsightEvidence[];
  recommendations: string[];
}

export const insightInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  impact: insightImpactLevelSchema,
  evidence: z.array(insightEvidenceSchema),
  recommendations: z.array(z.string()),
});
