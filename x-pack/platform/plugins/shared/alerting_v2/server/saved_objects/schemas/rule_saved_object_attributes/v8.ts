/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  ruleMetadataSchema as ruleMetadataSchemaV7,
  ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV7,
} from './v7';

/**
 * v8 adds `metadata.template`, the server-managed record of the rule template
 * a rule was created from. It stays optional, so existing rules remain valid
 * without a backfill.
 */
export const ruleMetadataSchema = ruleMetadataSchemaV7.extends({
  template: schema.maybe(schema.object({ id: schema.string() })),
});

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV7.extends({
  metadata: ruleMetadataSchema,
});
