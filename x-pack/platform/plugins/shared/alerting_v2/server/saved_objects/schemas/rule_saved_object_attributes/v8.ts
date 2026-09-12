/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleMetadataSchema as ruleMetadataSchemaV7 } from './v7';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV7 } from './v7';

/**
 * Adds `metadata.ownership` — the server-derived ownership object introduced
 * by the rule-ownership design. Flattened on disk as a single object with a
 * boolean `managed` discriminant and optional `solution`, `domain`, and `app`
 * sub-fields (the managed and unmanaged variants share the same row in the SO).
 *
 * Optional on disk: the model-version migration in step 4.5 backfills existing
 * rules — managed types stamp their declared ownership, everything else stamps
 * `{ managed: false }`.
 *
 * Ref: rule-ownership.md "The ownership object" and "Storage, mapping, and migration"
 */
export const ruleMetadataSchema = ruleMetadataSchemaV7.extends({
  ownership: schema.maybe(
    schema.object({
      managed: schema.boolean(),
      solution: schema.maybe(schema.string()),
      domain: schema.maybe(schema.string()),
      /** Max 128 chars — bounded in the Zod wire schema. */
      app: schema.maybe(schema.string({ maxLength: 128 })),
    })
  ),
});

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV7.extends({
  metadata: ruleMetadataSchema,
});
