/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { FeatureStatus } from '@kbn/streams-schema/src/feature';
import { featureStatusSchema } from '@kbn/streams-schema/src/feature';
import {
  STREAM_NAME,
  FEATURE_UUID,
  FEATURE_DESCRIPTION,
  FEATURE_VALUE,
  FEATURE_CONFIDENCE,
  FEATURE_EVIDENCE,
  FEATURE_STATUS,
  FEATURE_LAST_SEEN,
  FEATURE_NAME,
  FEATURE_TYPE,
  FEATURE_TAGS,
  FEATURE_META,
} from './fields';

export interface StoredFeature {
  [FEATURE_TYPE]: string;
  [FEATURE_UUID]: string;
  [FEATURE_NAME]: string;
  [FEATURE_DESCRIPTION]: string;
  [STREAM_NAME]: string;
  [FEATURE_VALUE]: Record<string, any>;
  [FEATURE_CONFIDENCE]: number;
  [FEATURE_EVIDENCE]: string[];
  [FEATURE_STATUS]: FeatureStatus;
  [FEATURE_LAST_SEEN]: string;
  [FEATURE_TAGS]: string[];
  [FEATURE_META]: Record<string, any>;
}

export const storedFeatureSchema: z.Schema<StoredFeature> = z.object({
  [FEATURE_TYPE]: z.string(),
  [FEATURE_UUID]: z.string(),
  [FEATURE_NAME]: z.string(),
  [FEATURE_DESCRIPTION]: z.string(),
  [STREAM_NAME]: z.string(),
  [FEATURE_VALUE]: z.record(z.string(), z.any()),
  [FEATURE_CONFIDENCE]: z.number(),
  [FEATURE_EVIDENCE]: z.array(z.string()),
  [FEATURE_STATUS]: featureStatusSchema,
  [FEATURE_LAST_SEEN]: z.string(),
  [FEATURE_TAGS]: z.array(z.string()),
  [FEATURE_META]: z.record(z.string(), z.any()),
});
