/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { conditionSchema } from '@kbn/streamlang/types/conditions';
import {
  STREAM_NAME,
  FEATURE_DESCRIPTION,
  FEATURE_CONFIDENCE,
  FEATURE_EVIDENCE,
  FEATURE_EVIDENCE_DOC_IDS,
  FEATURE_TITLE,
  FEATURE_TYPE,
  FEATURE_TAGS,
  FEATURE_META,
  FEATURE_ID,
  FEATURE_PROPERTIES,
  FEATURE_SUBTYPE,
  FEATURE_FILTER,
  FEATURE_RUN_ID,
  FEATURE_SEARCH_EMBEDDING,
  FEATURE_DELETED,
} from './fields';

export const storedFeatureSchema = z.object({
  '@timestamp': z.string(),
  [FEATURE_TYPE]: z.string(),
  [FEATURE_ID]: z.string(),
  [FEATURE_SUBTYPE]: z.string().optional(),
  [FEATURE_DESCRIPTION]: z.string(),
  [STREAM_NAME]: z.string(),
  [FEATURE_PROPERTIES]: z.record(z.string(), z.any()),
  [FEATURE_CONFIDENCE]: z.number(),
  [FEATURE_EVIDENCE]: z.array(z.string()).optional(),
  [FEATURE_EVIDENCE_DOC_IDS]: z.array(z.string()).optional(),
  [FEATURE_DELETED]: z.boolean().optional(),
  [FEATURE_TAGS]: z.array(z.string()).optional(),
  [FEATURE_META]: z.record(z.string(), z.any()).optional(),
  [FEATURE_TITLE]: z.string().optional(),
  [FEATURE_FILTER]: conditionSchema.optional(),
  [FEATURE_RUN_ID]: z.string().optional(),
  [FEATURE_SEARCH_EMBEDDING]: z.string().optional(),
});

export type StoredFeature = z.infer<typeof storedFeatureSchema>;
