/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineVersioning } from '@kbn/storage-adapter';
import { Streams } from '@kbn/streams-schema';
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

export const streamsVersioning = defineVersioning(v1Schema)
  .addVersion({
    schema: Streams.all.Definition.right,
    migrate: (input) => migrateOnRead(input),
  })
  .build();
