/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * Saved object attributes for an alerting v2 rule.
 *
 * This schema is intentionally separate from the API schemas defined in
 * `@kbn/alerting-v2-schemas`. The API schemas describe what clients send over
 * HTTP; this schema describes how a rule is persisted. Today they are 1:1,
 * but keeping them apart lets us change the storage model (e.g. versioning,
 * denormalization) without breaking the public API.
 */
export const ruleSavedObjectAttributesSchema = schema.object({
  kind: schema.oneOf([schema.literal('alert'), schema.literal('signal')]),

  metadata: schema.object({
    name: schema.string(),
    owner: schema.maybe(schema.string()),
    labels: schema.maybe(schema.arrayOf(schema.string())),
    time_field: schema.string(),
  }),

  schedule: schema.object({
    every: schema.string(),
    lookback: schema.maybe(schema.string()),
  }),

  evaluation: schema.object({
    query: schema.object({
      base: schema.string(),
      trigger: schema.object({
        condition: schema.string(),
      }),
    }),
  }),

  recovery_policy: schema.maybe(
    schema.object({
      type: schema.oneOf([schema.literal('query'), schema.literal('no_breach')]),
      query: schema.maybe(
        schema.object({
          base: schema.maybe(schema.string()),
          condition: schema.maybe(schema.string()),
        })
      ),
    })
  ),

  state_transition: schema.maybe(
    schema.object({
      pending_operator: schema.maybe(schema.oneOf([schema.literal('AND'), schema.literal('OR')])),
      pending_count: schema.maybe(schema.number()),
      pending_timeframe: schema.maybe(schema.string()),
      recovering_operator: schema.maybe(
        schema.oneOf([schema.literal('AND'), schema.literal('OR')])
      ),
      recovering_count: schema.maybe(schema.number()),
      recovering_timeframe: schema.maybe(schema.string()),
    })
  ),

  grouping: schema.maybe(
    schema.object({
      fields: schema.arrayOf(schema.string()),
    })
  ),

  no_data: schema.maybe(
    schema.object({
      behavior: schema.maybe(
        schema.oneOf([
          schema.literal('no_data'),
          schema.literal('last_status'),
          schema.literal('recover'),
        ])
      ),
      timeframe: schema.maybe(schema.string()),
    })
  ),

  notification_policies: schema.maybe(
    schema.arrayOf(
      schema.object({
        ref: schema.string(),
      })
    )
  ),

  // Server-managed fields
  enabled: schema.boolean(),
  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  updatedAt: schema.string(),
  createdAt: schema.string(),
});
