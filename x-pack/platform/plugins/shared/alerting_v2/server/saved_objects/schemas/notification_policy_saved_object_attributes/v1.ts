/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const notificationPolicyDestinationSchema = schema.oneOf([
  schema.object({
    type: schema.literal('workflow'),
    id: schema.string(),
  }),
]);

/**
 * Attributes for the notification policy saved object.
 */
export const notificationPolicySavedObjectAttributesSchema = schema.object({
  name: schema.string(),
  description: schema.string(),
  enabled: schema.boolean(),
  destinations: schema.arrayOf(notificationPolicyDestinationSchema),
  matcher: schema.maybe(schema.string()),
  group_by: schema.maybe(schema.arrayOf(schema.string())),
  throttle: schema.maybe(
    schema.object({
      interval: schema.string(),
    })
  ),
  snoozedUntil: schema.maybe(schema.nullable(schema.string())),
  auth: schema.object({
    apiKey: schema.maybe(schema.string()),
    owner: schema.string(),
    createdByUser: schema.boolean(),
  }),
  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  createdAt: schema.string(),
  updatedAt: schema.string(),
});
