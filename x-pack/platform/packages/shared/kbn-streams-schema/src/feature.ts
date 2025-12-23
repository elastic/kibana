/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const featureTypes = ['infrastructure', 'technology'] as const;
export type FeatureType = (typeof featureTypes)[number];

export const featureTypeSchema = z.enum(featureTypes);

const featureStatus = ['active', 'stale', 'expired'] as const;
export type FeatureStatus = (typeof featureStatus)[number];

export const featureStatusSchema = z.enum(featureStatus);

export interface BaseFeature<T extends FeatureType = FeatureType> {
  type: T;
  name: string;
  value: string;
  confidence: number;
  evidence: string[];
  status: FeatureStatus;
  last_seen: string;
}

export const baseFeatureSchema: z.Schema<BaseFeature> = z.object({
  type: featureTypeSchema,
  name: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string()),
  status: featureStatusSchema,
  last_seen: z.string(),
});

export type InfrastructureFeature = BaseFeature<'infrastructure'>;

export const infrastructureFeatureSchema: z.Schema<InfrastructureFeature> = baseFeatureSchema.and(
  z.object({
    type: z.literal('infrastructure'),
  })
);

export type TechnologyFeature = BaseFeature<'technology'>;

export const technologyFeatureSchema: z.Schema<TechnologyFeature> = baseFeatureSchema.and(
  z.object({
    type: z.literal('technology'),
  })
);

export type Feature = InfrastructureFeature | TechnologyFeature;

export const featureSchema: z.Schema<Feature> = z.union([
  infrastructureFeatureSchema,
  technologyFeatureSchema,
]);

export function isFeature(feature: any): feature is Feature {
  return featureSchema.safeParse(feature).success;
}
