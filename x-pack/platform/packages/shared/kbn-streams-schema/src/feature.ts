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

export const baseFeatureSchema = z.object({
  id: z.string(),
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

export function isComputedFeature(feature: BaseFeature) {
  return feature.type === DATASET_ANALYSIS_FEATURE_TYPE;
}
