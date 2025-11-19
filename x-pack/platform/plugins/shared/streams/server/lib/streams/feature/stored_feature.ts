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
  FEATURE_META,
  FEATURE_EVIDENCE,
} from './fields';
import { type FeatureType, featureTypeSchema } from '@kbn/streams-schema';

export interface StoredFeature {
  [FEATURE_TYPE]: FeatureType;
  [FEATURE_UUID]: string;
  [FEATURE_NAME]: string;
  [FEATURE_DESCRIPTION]: string;
  [STREAM_NAME]: string;
  [FEATURE_FILTER]?: Condition;
  [FEATURE_META]?: Record<string, unknown>;
  [FEATURE_EVIDENCE]: string[];
}

export const storedFeatureSchema: z.Schema<StoredFeature> = z.object({
  [FEATURE_TYPE]: featureTypeSchema,
  [FEATURE_UUID]: z.string(),
  [FEATURE_NAME]: z.string(),
  [FEATURE_DESCRIPTION]: z.string(),
  [STREAM_NAME]: z.string(),
  [FEATURE_FILTER]: z.optional(conditionSchema),
  [FEATURE_META]: z.optional(z.record(z.string(), z.unknown())),
  [FEATURE_EVIDENCE]: z.array(z.string()),
});
