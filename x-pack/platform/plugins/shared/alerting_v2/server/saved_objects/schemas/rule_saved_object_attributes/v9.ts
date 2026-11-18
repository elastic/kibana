/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleSavedObjectAttributesSchema as ruleSavedObjectAttributesSchemaV8 } from './v8';

/** Adds the optional, unresolved reason template without backfilling existing rules. */
export const ruleSavedObjectAttributesSchema = ruleSavedObjectAttributesSchemaV8.extends({
  reason: schema.maybe(
    schema.description({
      maxLength: 1024,
      validate: (value) =>
        value.trim().length === 0 ? 'Reason template must not be blank.' : undefined,
    })
  ),
});
