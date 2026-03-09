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
  SYSTEM_UUID,
  SYSTEM_DESCRIPTION,
  SYSTEM_FILTER,
  SYSTEM_NAME,
  SYSTEM_TYPE,
} from './fields';
import type { StoredSystem } from './stored_system';

const v1Schema = z.object({
  [SYSTEM_UUID]: z.string(),
  [STREAM_NAME]: z.string(),
  [SYSTEM_NAME]: z.string(),
  [SYSTEM_DESCRIPTION]: z.string(),
  [SYSTEM_FILTER]: z.any().optional(),
});

const v2Schema = z.object({
  [SYSTEM_TYPE]: z.literal('system'),
  [SYSTEM_UUID]: z.string(),
  [STREAM_NAME]: z.string(),
  [SYSTEM_NAME]: z.string(),
  [SYSTEM_DESCRIPTION]: z.string(),
  [SYSTEM_FILTER]: z.any().optional(),
});

export const systemVersioning: StorageSchemaVersioning<StoredSystem> = defineVersioning(v1Schema)
  .addVersion({
    schema: v2Schema,
    migrate: (prev) => ({ ...prev, [SYSTEM_TYPE]: 'system' as const }),
  })
  .build() as StorageSchemaVersioning<StoredSystem>;
