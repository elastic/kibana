/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { actionPolicyDestinationSchema } from './v1';

/**
 * v2 flattens the nested `auth` object into top-level attributes so that the
 * Encrypted Saved Objects service can encrypt/bind them correctly. ESO resolves
 * attribute names via `Object.hasOwn(attributes, key)`, which silently ignores
 * dotted paths like `auth.apiKey`. The model-version-2 migration backfills
 * `apiKeyOwner` from `auth.owner` and `apiKeyCreatedByUser` from
 * `auth.createdByUser`, then removes `auth.apiKey` (the formerly-plaintext key).
 *
 * The `auth` container is kept as optional for rollback compatibility: a v2 doc
 * down-converted to v1 by the rollback pipeline must still satisfy v1's
 * `forwardCompatibility` schema, which expects `auth` to be present. `auth.apiKey`
 * is absent on all v2 docs, so the `schema.maybe(schema.string())` on that
 * sub-field accepts the absence.
 */
export const actionPolicySavedObjectAttributesSchema = schema.object({
  name: schema.string(),
  description: schema.string(),
  enabled: schema.boolean(),
  destinations: schema.arrayOf(actionPolicyDestinationSchema, { minSize: 1, maxSize: 20 }),
  matcher: schema.maybe(schema.nullable(schema.string())),
  groupBy: schema.maybe(
    schema.nullable(schema.arrayOf(schema.string(), { minSize: 1, maxSize: 10 }))
  ),
  tags: schema.maybe(schema.nullable(schema.arrayOf(schema.string(), { maxSize: 20 }))),
  groupingMode: schema.maybe(
    schema.nullable(
      schema.oneOf([
        schema.literal('per_episode'),
        schema.literal('all'),
        schema.literal('per_field'),
      ])
    )
  ),
  throttle: schema.maybe(
    schema.nullable(
      schema.object({
        strategy: schema.maybe(
          schema.oneOf([
            schema.literal('on_status_change'),
            schema.literal('per_status_interval'),
            schema.literal('time_interval'),
            schema.literal('every_time'),
          ])
        ),
        interval: schema.maybe(schema.nullable(schema.string())),
      })
    )
  ),
  snoozedUntil: schema.maybe(schema.nullable(schema.string())),
  apiKey: schema.maybe(schema.string()),
  apiKeyOwner: schema.string(),
  apiKeyCreatedByUser: schema.boolean(),
  /** @deprecated Superseded by the flat apiKeyOwner / apiKeyCreatedByUser fields. */
  auth: schema.maybe(
    schema.object({
      apiKey: schema.maybe(schema.string()),
      owner: schema.string(),
      createdByUser: schema.boolean(),
    })
  ),
  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  createdAt: schema.string(),
  updatedAt: schema.string(),
});
