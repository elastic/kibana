/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineVersioning, type StorageSchemaVersioning } from '@kbn/storage-adapter';
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
import type { StoredFeature } from './stored_feature';

const featureStatusValues = ['active', 'stale', 'expired'] as const;

const v1Schema = z
  .object({
    [FEATURE_TYPE]: z.string(),
    [FEATURE_UUID]: z.string(),
    [FEATURE_DESCRIPTION]: z.string(),
    [STREAM_NAME]: z.string(),
    [FEATURE_CONFIDENCE]: z.number(),
    [FEATURE_STATUS]: z.enum(featureStatusValues),
    [FEATURE_LAST_SEEN]: z.string(),
  })
  .passthrough();

const v2Schema = z
  .object({
    [FEATURE_TYPE]: z.string(),
    [FEATURE_ID]: z.string(),
    [FEATURE_UUID]: z.string(),
    [FEATURE_SUBTYPE]: z.string().optional(),
    [FEATURE_DESCRIPTION]: z.string(),
    [STREAM_NAME]: z.string(),
    [FEATURE_PROPERTIES]: z.record(z.string(), z.any()),
    [FEATURE_CONFIDENCE]: z.number(),
    [FEATURE_EVIDENCE]: z.array(z.string()).optional(),
    [FEATURE_STATUS]: z.enum(featureStatusValues),
    [FEATURE_LAST_SEEN]: z.string(),
    [FEATURE_TAGS]: z.array(z.string()).optional(),
    [FEATURE_META]: z.record(z.string(), z.any()).optional(),
    [FEATURE_EXPIRES_AT]: z.string().optional(),
    [FEATURE_TITLE]: z.string().optional(),
  })
  .passthrough();

export const featureVersioning: StorageSchemaVersioning<StoredFeature> = defineVersioning(v1Schema)
  .addVersion({
    schema: v2Schema,
    migrate: (prev) => {
      const source = prev as Record<string, unknown>;

      if (FEATURE_ID in source) {
        return source as Record<string, unknown> & { [K in keyof StoredFeature]: StoredFeature[K] };
      }

      const migrated = { ...source };
      migrated[FEATURE_ID] = source[FEATURE_UUID];
      migrated[FEATURE_SUBTYPE] = source['feature.name'];
      migrated[FEATURE_PROPERTIES] = source['feature.value'];
      delete migrated['feature.name'];
      delete migrated['feature.value'];

      return migrated as Record<string, unknown> & { [K in keyof StoredFeature]: StoredFeature[K] };
    },
  })
  .build() as StorageSchemaVersioning<StoredFeature>;
