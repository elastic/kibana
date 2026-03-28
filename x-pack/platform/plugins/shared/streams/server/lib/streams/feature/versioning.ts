/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';
import { z } from '@kbn/zod/v4';
import { defineVersioning, type StorageSchemaVersioning } from '@kbn/storage-adapter';
import { featureStatusSchema } from '@kbn/streams-schema';
import type { StoredFeature } from './stored_feature';
import {
  STREAM_NAME,
  FEATURE_UUID,
  FEATURE_ID,
  FEATURE_TYPE,
  FEATURE_SUBTYPE,
  FEATURE_DESCRIPTION,
  FEATURE_PROPERTIES,
  FEATURE_CONFIDENCE,
  FEATURE_EVIDENCE,
  FEATURE_STATUS,
  FEATURE_LAST_SEEN,
  FEATURE_TAGS,
  FEATURE_META,
  FEATURE_EXPIRES_AT,
  FEATURE_TITLE,
} from './fields';

const v1Schema = z.looseObject({
  [FEATURE_TYPE]: z.string(),
  [FEATURE_UUID]: z.string(),
  [FEATURE_DESCRIPTION]: z.string(),
  [STREAM_NAME]: z.string(),
  [FEATURE_CONFIDENCE]: z.number(),
  [FEATURE_STATUS]: featureStatusSchema,
  [FEATURE_LAST_SEEN]: z.string(),
  'feature.name': z.string().optional(),
  'feature.value': z.record(z.string(), z.any()).optional(),
});

const v2Schema = z.looseObject({
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

// Type assertion needed because `z.looseObject` adds `{ [k: string]: unknown }`
// to the Zod output, which doesn't structurally match `StoredFeature`.
export const featureVersioning = defineVersioning(v1Schema)
  .addVersion({
    schema: v2Schema,
    migrate: (prev) => {
      const existing = prev as Record<string, unknown>;

      if (isString(existing[FEATURE_ID])) {
        return { ...prev } as z.input<typeof v2Schema>;
      }

      // Literal dot-in-key field names from the legacy schema, not nested object paths
      const { 'feature.name': featureName, 'feature.value': featureValue, ...rest } = prev;

      return {
        ...rest,
        [FEATURE_ID]: prev[FEATURE_UUID],
        [FEATURE_SUBTYPE]: featureName,
        [FEATURE_PROPERTIES]: featureValue ?? {},
      };
    },
  })
  .build() as StorageSchemaVersioning<StoredFeature>;
