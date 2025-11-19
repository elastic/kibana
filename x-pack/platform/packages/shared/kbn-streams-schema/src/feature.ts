/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionSchema, type Condition } from '@kbn/streamlang';
import { z } from '@kbn/zod';
import { streamObjectNameSchema } from './shared/stream_object_name';

export const featureTypeSchema = z.enum(['system', 'infrastructure']);
export type FeatureType = z.infer<typeof featureTypeSchema>;

export interface BaseFeature {
  name: string;
  description: string;
  type: FeatureType;
}

export interface SystemFeature extends BaseFeature {
  type: 'system';
  filter: Condition;
}

export interface InfrastructureFeature extends BaseFeature {
  type: 'infrastructure';
  provider?: string;
}

export type Feature = SystemFeature | InfrastructureFeature;

const systemFeatureSchema: z.Schema<SystemFeature> = z.object({
  name: streamObjectNameSchema,
  description: z.string(),
  type: z.literal('system'),
  filter: conditionSchema,
});

const infrastructureFeatureSchema: z.Schema<InfrastructureFeature> = z.object({
  name: streamObjectNameSchema,
  description: z.string(),
  type: z.literal('infrastructure'),
  provider: z.string().optional(),
});

export const featureSchema: z.Schema<Feature> = z.union([
  systemFeatureSchema,
  infrastructureFeatureSchema,
]);
