/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV8 } from './v8';

/**
 * Makes `query` optional on the stored rule.
 *
 * Execution-time builder rules compile their query fresh on every run and never
 * persist one. Only write-time builder rules and plain ES|QL rules carry a
 * stored query.
 *
 * Ref: rule-execution-logic.md "A rule without a persisted query"
 */
export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV8.extends({
  query: schema.maybe(
    schema.oneOf([
      schema.object({
        format: schema.literal('composed'),
        base: schema.string(),
        breach: schema.object({ segment: schema.string() }),
        recovery: schema.maybe(schema.object({ segment: schema.string() })),
      }),
      schema.object({
        format: schema.literal('standalone'),
        breach: schema.object({ query: schema.string() }),
        recovery: schema.maybe(schema.object({ query: schema.string() })),
        no_data: schema.maybe(schema.object({ query: schema.string() })),
      }),
    ])
  ),
});
