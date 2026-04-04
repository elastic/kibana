/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const notificationPolicyDestinationSchema = schema.object({
  type: schema.literal('workflow'),
  id: schema.string(),
});

export const notificationPolicySavedObjectAttributesSchema = schema.object({
  name: schema.string(),
  description: schema.string(),
  enabled: schema.boolean(),
  destinations: schema.arrayOf(notificationPolicyDestinationSchema, { minSize: 1, maxSize: 20 }),
  matcher: schema.maybe(schema.nullable(schema.string())),
  groupBy: schema.maybe(
    schema.nullable(schema.arrayOf(schema.string(), { minSize: 1, maxSize: 10 }))
  ),
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
        interval: schema.maybe(schema.string()),
      })
    )
  ),
  snoozedUntil: schema.maybe(schema.nullable(schema.string())),
  auth: schema.object({
    apiKey: schema.maybe(schema.string()),
    owner: schema.string(),
    createdByUser: schema.boolean(),
  }),
  createdBy: schema.nullable(schema.string()),
  createdByUsername: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  updatedByUsername: schema.nullable(schema.string()),
  createdAt: schema.string(),
  updatedAt: schema.string(),
});
