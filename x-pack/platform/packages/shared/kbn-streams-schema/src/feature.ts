/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { streamObjectNameSchema } from './shared/stream_object_name';

const featureTypes = ['infrastructure'] as const;
export type FeatureType = (typeof featureTypes)[number];

export const featureTypeSchema = z.enum(featureTypes);

export interface BaseFeature<T extends FeatureType = FeatureType> {
  type: T;
  name: string;
  description: string;
}

export const baseFeatureSchema: z.Schema<BaseFeature> = z.object({
  type: featureTypeSchema,
  name: streamObjectNameSchema,
  description: z.string(),
});

export type InfrastructureFeature = BaseFeature<'infrastructure'>;

export const infrastructureFeatureSchema: z.Schema<InfrastructureFeature> = baseFeatureSchema.and(
  z.object({
    type: z.literal('infrastructure'),
  })
);

export type Feature = InfrastructureFeature;

export const featureSchema: z.Schema<Feature> = infrastructureFeatureSchema;

export function isFeature(feature: any): feature is Feature {
  return featureSchema.safeParse(feature).success;
}
