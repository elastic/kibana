/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineVersioning, type StorageSchemaVersioning } from '@kbn/storage-adapter';
import type { Streams } from '@kbn/streams-schema';
import { migrateOnRead } from './migrate_on_read';

/**
 * Permissive v1 schema that accepts any pre-versioning stream document.
 * Only requires `name` (present in all stream types). `looseObject`
 * preserves the full document so `migrateOnRead` can inspect and transform
 * every field.
 */
const v1Schema = z.looseObject({
  name: z.string(),
});

/**
 * Permissive v2 schema that validates common fields added by `migrateOnRead`
 * without enforcing stream-type-specific structures. The stored shape differs
 * from the full `Streams.all.Definition` — for example, query streams omit
 * `query.esql` at rest because the ES|QL lives in the view. Using
 * `looseObject` ensures writes are not rejected for stream-type-specific
 * fields that are intentionally absent.
 */
const v2Schema = z.looseObject({
  name: z.string(),
  description: z.string(),
  updated_at: z.string(),
  type: z.string(),
});

export const streamsVersioning = defineVersioning(v1Schema)
  .addVersion({
    schema: v2Schema,
    migrate: (input) => migrateOnRead(input) as unknown as z.input<typeof v2Schema>,
  })
  .build() as unknown as StorageSchemaVersioning<Streams.all.Definition>;
