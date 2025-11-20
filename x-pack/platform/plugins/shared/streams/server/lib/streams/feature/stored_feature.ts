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
} from './fields';

export interface StoredFeature {
  [FEATURE_UUID]: string;
  [FEATURE_NAME]: string;
  [FEATURE_DESCRIPTION]: string;
  [FEATURE_FILTER]: Condition;
  [STREAM_NAME]: string;
}

export const storedFeatureSchema: z.Schema<StoredFeature> = z.object({
  [FEATURE_UUID]: z.string(),
  [FEATURE_NAME]: z.string(),
  [FEATURE_DESCRIPTION]: z.string(),
  [FEATURE_FILTER]: conditionSchema,
  [STREAM_NAME]: z.string(),
});
