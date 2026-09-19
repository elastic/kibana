/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleMetadataSchema as ruleMetadataSchemaV5 } from './v5';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV5 } from './v5';

/**
 * Adds `metadata.revision` — the meaningful-edit counter introduced by the
 * rule-versions design. Incremented by at most one per write, only when the
 * write changes a field that is meaningful to the rule configuration.
 *
 * Optional on disk: the model-version migration in step 4.5 backfills existing
 * rules with 0; reads fall back to 0 for unmigrated documents via
 * `RULE_REVISION_FALLBACK`.
 *
 * Ref: rule-versions.md "metadata.revision: the meaningful-edit counter"
 */
export const ruleMetadataSchema = ruleMetadataSchemaV5.extends({
  revision: schema.maybe(schema.number()),
});

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV5.extends({
  metadata: ruleMetadataSchema,
});
