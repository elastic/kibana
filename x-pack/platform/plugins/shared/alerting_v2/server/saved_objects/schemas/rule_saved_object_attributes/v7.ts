/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleMetadataSchema as ruleMetadataSchemaV6 } from './v6';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV6 } from './v6';

/**
 * Adds `metadata.source` — the three-variant provenance object introduced by
 * the rule-source design. All three sub-fields are represented in a single
 * flat object; `id` is absent on `internal` rules (the two derived variants
 * always carry it). Optional on disk: the model-version migration in step 4.5
 * backfills existing rules with `{ type: 'internal', version: 1 }`.
 *
 * Ref: rule-source.md "The three variants"
 */
export const ruleMetadataSchema = ruleMetadataSchemaV6.extends({
  source: schema.maybe(
    schema.object({
      type: schema.oneOf([
        schema.literal('internal'),
        schema.literal('template'),
        schema.literal('external'),
      ]),
      version: schema.number(),
      id: schema.maybe(schema.string()),
    })
  ),
});

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV6.extends({
  metadata: ruleMetadataSchema,
});
