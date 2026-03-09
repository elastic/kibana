/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StorageSchemaVersioning } from '@kbn/storage-adapter';
import type { Streams } from '@kbn/streams-schema';
import { migrateOnRead } from './migrate_on_read';

/**
 * Permissive v1 schema that accepts any pre-versioning stream document.
 * Only requires `name` (present in all stream types). `.passthrough()`
 * preserves the full document so `migrateOnRead` can inspect and transform
 * every field.
 */
const v1Schema = z
  .object({
    name: z.string(),
  })
  .passthrough();

/**
 * v2 schema validates the post-migration shape: `description` and `updated_at`
 * are guaranteed by `migrateOnRead`. The complex `ingest`, `query`, and
 * `query_streams` fields are opaque (ES mapping has `enabled: false`), so they
 * pass through without structural validation.
 */
const v2Schema = z
  .object({
    name: z.string(),
    description: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const streamsVersioning = new StorageSchemaVersioning<Streams.all.Definition>([
  { version: 1, schema: v1Schema },
  {
    version: 2,
    schema: v2Schema,
    migrate: (input) => migrateOnRead(input as Record<string, unknown>),
  },
]);
