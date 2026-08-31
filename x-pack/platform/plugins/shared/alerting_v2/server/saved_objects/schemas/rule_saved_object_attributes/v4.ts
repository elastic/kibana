/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleMetadataSchema as ruleMetadataSchemaV2 } from './v2';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV3 } from './v3';

/**
 * v4 adds `metadata.builder_fields`: the structured parameters a rule builder
 * was configured with, stored alongside the `query` generated from them.
 *
 * Persisting the parameters rather than only the compiled query is what lets a
 * builder reopen a rule exactly as it was authored, instead of parsing ES|QL
 * back into form state. Optional so rules created before v4 — which carry at
 * most a `builder_type` — stay valid.
 *
 * The shape of the record is deliberately not enforced here: it is owned by the
 * builder registered under `builder_type`, which validates it on every write.
 * Constraining it in the storage schema would mean a rule stored by a newer
 * builder version could not be read back by an older one.
 */
export const ruleMetadataSchema = ruleMetadataSchemaV2.extends({
  builder_fields: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV3.extends({
  metadata: ruleMetadataSchema,
});
