/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const featureStatus = ['active', 'stale', 'expired'] as const;
export const featureStatusSchema = z.enum(featureStatus);
export type FeatureStatus = z.infer<typeof featureStatusSchema>;

export const DATASET_ANALYSIS_FEATURE_TYPE = 'dataset_analysis' as const;
export const LOG_SAMPLES_FEATURE_TYPE = 'log_samples' as const;
export const LOG_PATTERNS_FEATURE_TYPE = 'log_patterns' as const;
export const ERROR_LOGS_FEATURE_TYPE = 'error_logs' as const;

export const COMPUTED_FEATURE_TYPES = [
  DATASET_ANALYSIS_FEATURE_TYPE,
  LOG_SAMPLES_FEATURE_TYPE,
  LOG_PATTERNS_FEATURE_TYPE,
  ERROR_LOGS_FEATURE_TYPE,
] as const;

export const baseFeatureSchema = z.object({
  id: z.string(),
  stream_name: z.string(),
  type: z.string(),
  subtype: z.string().optional(),
  title: z.string().optional(),
  description: z.string(),
  properties: z.record(z.string(), z.unknown()),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  meta: z.record(z.string(), z.any()).optional(),
});

export type BaseFeature = z.infer<typeof baseFeatureSchema>;

export const featureSchema = baseFeatureSchema.and(
  z.object({
    uuid: z.string(),
    status: featureStatusSchema,
    last_seen: z.string(),
    expires_at: z.string().optional(),
  })
);

export type Feature = z.infer<typeof featureSchema>;

export function isFeature(feature: unknown): feature is Feature {
  return featureSchema.safeParse(feature).success;
}

export function isComputedFeature(feature: BaseFeature): boolean {
  return (COMPUTED_FEATURE_TYPES as unknown as string[]).includes(feature.type);
}
