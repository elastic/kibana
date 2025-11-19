/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Condition } from '@kbn/streamlang';
import { conditionSchema } from '@kbn/streamlang';
import {
  STREAM_NAME,
  FEATURE_UUID,
  FEATURE_DESCRIPTION,
  FEATURE_FILTER,
  FEATURE_NAME,
  FEATURE_TYPE,
  FEATURE_PROVIDER,
} from './fields';
import type { FeatureType } from '@kbn/streams-schema';
import { featureTypeSchema } from '@kbn/streams-schema';

interface StoredFeatureBase {
  [FEATURE_UUID]: string;
  [FEATURE_NAME]: string;
  [FEATURE_DESCRIPTION]: string;
  [FEATURE_TYPE]: FeatureType;
  [STREAM_NAME]: string;
}

export interface SystemStoredFeature extends StoredFeatureBase {
  [FEATURE_FILTER]: Condition;
}

export const systemStoredFeatureSchema: z.Schema<SystemStoredFeature> = z.object({
  [FEATURE_UUID]: z.string(),
  [FEATURE_NAME]: z.string(),
  [FEATURE_DESCRIPTION]: z.string(),
  [FEATURE_TYPE]: featureTypeSchema,
  [FEATURE_FILTER]: conditionSchema,
  [STREAM_NAME]: z.string(),
});

export interface InfrastructureStoredFeature extends StoredFeatureBase {
  [FEATURE_PROVIDER]?: string;
}

export const infrastructureStoredFeatureSchema: z.Schema<InfrastructureStoredFeature> = z.object({
  [FEATURE_UUID]: z.string(),
  [FEATURE_NAME]: z.string(),
  [FEATURE_DESCRIPTION]: z.string(),
  [FEATURE_TYPE]: featureTypeSchema,
  [FEATURE_PROVIDER]: z.string().optional(),
  [STREAM_NAME]: z.string(),
});

export type StoredFeature = SystemStoredFeature | InfrastructureStoredFeature;
