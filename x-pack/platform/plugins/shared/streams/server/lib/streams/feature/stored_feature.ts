/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  type FeatureType,
  featureTypeSchema,
  type FeatureStatus,
  featureStatusSchema,
} from '@kbn/streams-schema';
import {
  STREAM_NAME,
  FEATURE_UUID,
  FEATURE_NAME,
  FEATURE_TYPE,
  FEATURE_VALUE,
  FEATURE_CONFIDENCE,
  FEATURE_EVIDENCE,
  FEATURE_STATUS,
  FEATURE_LAST_SEEN,
} from './fields';

export interface StoredFeature {
  [FEATURE_UUID]: string;
  [FEATURE_TYPE]: FeatureType;
  [STREAM_NAME]: string;
  [FEATURE_NAME]: string;
  [FEATURE_VALUE]: string;
  [FEATURE_CONFIDENCE]: number;
  [FEATURE_EVIDENCE]: string[];
  [FEATURE_STATUS]: FeatureStatus;
  [FEATURE_LAST_SEEN]: string;
}

export const storedFeatureSchema: z.Schema<StoredFeature> = z.object({
  [FEATURE_TYPE]: featureTypeSchema,
  [FEATURE_UUID]: z.string(),
  [STREAM_NAME]: z.string(),
  [FEATURE_NAME]: z.string(),
  [FEATURE_VALUE]: z.string(),
  [FEATURE_CONFIDENCE]: z.number(),
  [FEATURE_EVIDENCE]: z.array(z.string()),
  [FEATURE_STATUS]: featureStatusSchema,
  [FEATURE_LAST_SEEN]: z.string(),
});
