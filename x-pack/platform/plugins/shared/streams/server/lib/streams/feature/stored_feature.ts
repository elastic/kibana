/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { featureStatusSchema } from '@kbn/streams-schema/src/feature';
import {
  STREAM_NAME,
  FEATURE_UUID,
  FEATURE_DESCRIPTION,
  FEATURE_CONFIDENCE,
  FEATURE_EVIDENCE,
  FEATURE_STATUS,
  FEATURE_LAST_SEEN,
  FEATURE_TITLE,
  FEATURE_TYPE,
  FEATURE_TAGS,
  FEATURE_META,
  FEATURE_EXPIRES_AT,
  FEATURE_ID,
  FEATURE_PROPERTIES,
  FEATURE_SUBTYPE,
} from './fields';

export const storedFeatureSchema = z.object({
  [FEATURE_TYPE]: z.string(),
  [FEATURE_ID]: z.string(),
  [FEATURE_UUID]: z.string(),
  [FEATURE_SUBTYPE]: z.string().optional(),
  [FEATURE_DESCRIPTION]: z.string(),
  [STREAM_NAME]: z.string(),
  [FEATURE_PROPERTIES]: z.record(z.string(), z.any()),
  [FEATURE_CONFIDENCE]: z.number(),
  [FEATURE_EVIDENCE]: z.array(z.string()).optional(),
  [FEATURE_STATUS]: featureStatusSchema,
  [FEATURE_LAST_SEEN]: z.string(),
  [FEATURE_TAGS]: z.array(z.string()).optional(),
  [FEATURE_META]: z.record(z.string(), z.any()).optional(),
  [FEATURE_EXPIRES_AT]: z.string().optional(),
  [FEATURE_TITLE]: z.string().optional(),
});

export type StoredFeature = z.infer<typeof storedFeatureSchema>;
