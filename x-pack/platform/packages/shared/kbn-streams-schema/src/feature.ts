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
  id: string;
  type: string;
  subtype?: string;
  title?: string;
  description: string;
  properties: Record<string, string>;
  confidence: number;
  evidence: string[];
  tags: string[];
  meta: Record<string, any>;
}

export interface Feature extends BaseFeature {
  uuid: string;
  status: FeatureStatus;
  last_seen: string;
  expires_at?: string;
}

export const baseFeatureSchema: z.Schema<BaseFeature> = z.object({
  id: z.string(),
  type: z.string(),
  subtype: z.string().optional(),
  title: z.string().optional(),
  description: z.string(),
  properties: z.record(z.string(), z.string()),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string()),
  tags: z.array(z.string()),
  meta: z.record(z.string(), z.any()),
});

export const featureSchema: z.Schema<Feature> = baseFeatureSchema.and(
  z.object({
    uuid: z.string(),
    status: featureStatusSchema,
    last_seen: z.string(),
    expires_at: z.string().optional(),
  })
);

export function isFeature(feature: any): feature is Feature {
  return featureSchema.safeParse(feature).success;
}
