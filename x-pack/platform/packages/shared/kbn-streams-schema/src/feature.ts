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

export interface Feature {
  type: FeatureType;
  name: string;
  description: string;
  filter?: Condition;
}

export const featureSchema: z.Schema<Feature> = z.object({
  type: featureTypeSchema,
  name: streamObjectNameSchema,
  description: z.string(),
  filter: z.optional(conditionSchema),
});

export type FeatureWithFilter = Feature & { filter: Condition };

export type SystemFeature = FeatureWithFilter;

export function isFeatureWithFilter(feature: Feature): feature is FeatureWithFilter {
  return Boolean(feature.filter && isCondition(feature.filter));
}
