/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleMetadataSchema as ruleMetadataSchemaV7 } from './v7';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV7 } from './v7';

export const ruleMetadataSchema = ruleMetadataSchemaV7.extends({
  builder_fields: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV7.extends({
  metadata: ruleMetadataSchema,
});
