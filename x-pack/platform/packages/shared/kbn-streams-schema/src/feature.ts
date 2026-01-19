/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const featureStatus = ['active', 'stale', 'expired'] as const;
export type FeatureStatus = (typeof featureStatus)[number];

export const featureStatusSchema = z.enum(featureStatus);

export interface BaseFeature {
  type: string;
  name: string;
  description: string;
  value: Record<string, any>;
  confidence: number;
  evidence: string[];
  tags: string[];
  meta: Record<string, any>;
}

export interface Feature extends BaseFeature {
  id: string;
  status: FeatureStatus;
  last_seen: string;
}

export const baseFeatureSchema: z.Schema<BaseFeature> = z.object({
  type: z.string(),
  name: z.string(),
  description: z.string(),
  value: z.record(z.string(), z.any()),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string()),
  tags: z.array(z.string()),
  meta: z.record(z.string(), z.any()),
});

export const featureSchema: z.Schema<Feature> = baseFeatureSchema.and(
  z.object({
    id: z.string(),
    status: featureStatusSchema,
    last_seen: z.string(),
  })
);

export function isFeature(feature: any): feature is Feature {
  return featureSchema.safeParse(feature).success;
}
