/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleMetadataSchema as ruleMetadataSchemaV1 } from './v1';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV6 } from './v6';

/**
 * v7 adds `metadata.routing_tags`, the tags action policies match against.
 * It has the same storage shape as `metadata.tags` and stays optional, so
 * existing rules remain valid without a backfill.
 */
export const ruleMetadataSchema = ruleMetadataSchemaV1.extends({
  routing_tags: schema.maybe(schema.arrayOf(schema.string(), { minSize: 1, maxSize: 100 })),
});

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV6.extends({
  metadata: ruleMetadataSchema,
});
