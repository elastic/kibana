/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionSchema, isCondition, type Condition } from '@kbn/streamlang';
import { z } from '@kbn/zod';
import { streamObjectNameSchema } from './shared/stream_object_name';

const featureTypes = ['system'] as const;
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

export type FeatureWithFilter<T extends FeatureType = FeatureType> = BaseFeature<T> & {
  filter: Condition;
};

export const featureWithFilterSchema: z.Schema<FeatureWithFilter> = baseFeatureSchema.and(
  z.object({
    filter: conditionSchema,
  })
);

export type SystemFeature = FeatureWithFilter<'system'>;

export const systemFeatureSchema: z.Schema<SystemFeature> = featureWithFilterSchema.and(
  z.object({
    type: z.literal('system'),
  })
);

export type Feature = SystemFeature;

export const featureSchema: z.Schema<Feature> = systemFeatureSchema;

export function isFeatureWithFilter(feature: Feature): feature is SystemFeature {
  return 'filter' in feature && isCondition(feature.filter);
}
