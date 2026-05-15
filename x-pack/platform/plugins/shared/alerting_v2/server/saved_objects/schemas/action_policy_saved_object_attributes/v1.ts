/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const actionPolicyDestinationSchema = schema.object({
  type: schema.literal('workflow'),
  id: schema.string(),
});

export const actionPolicySavedObjectAttributesSchema = schema.object(
  {
    name: schema.string(),
    description: schema.string(),
    type: schema.oneOf([schema.literal('global'), schema.literal('single_rule')]),
    ruleId: schema.maybe(schema.nullable(schema.string({ minLength: 1, maxLength: 256 }))),
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
  },
  {
    validate: (attributes) => {
      if (attributes.type === 'single_rule') {
        if (!attributes.ruleId) {
          return 'ruleId is required when type is "single_rule"';
        }
        return;
      }
      if (attributes.ruleId != null) {
        return 'ruleId is only allowed when type is "single_rule"';
      }
    },
  }
);
