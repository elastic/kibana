/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { actionPolicyDestinationSchema } from './v1';

export const actionPolicySavedObjectAttributesSchemaV3 = schema.object({
  name: schema.string(),
  description: schema.string(),
  enabled: schema.boolean(),
  destinations: schema.arrayOf(actionPolicyDestinationSchema, { minSize: 1, maxSize: 20 }),
  matcher: schema.maybe(
    schema.nullable(
      schema.object({
        tags: schema.maybe(
          schema.nullable(
            schema.arrayOf(schema.string({ minLength: 1, maxLength: 256 }), { maxSize: 50 })
          )
        ),
        expression: schema.maybe(schema.nullable(schema.string({ maxLength: 4096 }))),
      })
    )
  ),
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

export type ActionPolicySavedObjectAttributesV3 = ReturnType<
  typeof actionPolicySavedObjectAttributesSchemaV3.validate
>;
