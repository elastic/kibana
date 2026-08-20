/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV3 } from './v3';

/**
 * v4 makes the composed breach block optional. Omitting it means every row
 * returned by the base query is treated as a breach.
 */
export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV3.extends({
  query: schema.oneOf([
    schema.object({
      format: schema.literal('composed'),
      base: schema.string(),
      breach: schema.maybe(schema.object({ segment: schema.string() })),
      recovery: schema.maybe(schema.object({ segment: schema.string() })),
    }),
    schema.object({
      format: schema.literal('standalone'),
      breach: schema.object({ query: schema.string() }),
      recovery: schema.maybe(schema.object({ query: schema.string() })),
      no_data: schema.maybe(schema.object({ query: schema.string() })),
    }),
  ]),
});
