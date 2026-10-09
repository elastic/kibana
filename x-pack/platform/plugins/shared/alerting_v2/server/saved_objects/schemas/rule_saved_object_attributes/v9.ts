/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleMetadataSchema as ruleMetadataSchemaV8 } from './v8';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV8 } from './v8';

/**
 * Adds `metadata.signature_id` — the stable logical-rule identifier introduced
 * by the rule-identity design. Optional on disk: the model-version migration in
 * step 4.5 backfills existing rules with their own saved-object id.
 */
export const ruleMetadataSchema = ruleMetadataSchemaV8.extends({
  signature_id: schema.maybe(schema.string({ minLength: 1, maxLength: 256 })),
});

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV8.extends({
  metadata: ruleMetadataSchema,
});
