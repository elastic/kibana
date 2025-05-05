/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { scheduleRruleSchema } from '@kbn/task-manager-plugin/server';

const rawLayoutIdSchema = schema.oneOf([
  schema.literal('preserve_layout'),
  schema.literal('print'),
  schema.literal('canvas'),
]);

export const rawNotificationSchema = schema.object({
  email: schema.maybe(
    schema.object({
      to: schema.arrayOf(schema.string(), { minSize: 1 }),
    })
  ),
});

export const rawScheduledReportSchema = schema.object({
  createdAt: schema.string(),
  createdBy: schema.oneOf([schema.string(), schema.boolean()]),
  enabled: schema.boolean(),
  jobType: schema.string(),
  meta: schema.object({
    isDeprecated: schema.maybe(schema.boolean()),
    layout: schema.maybe(rawLayoutIdSchema),
    objectType: schema.string(),
  }),
  migrationVersion: schema.string(),
  notification: schema.maybe(rawNotificationSchema),
  payload: schema.string(),
  schedule: scheduleRruleSchema,
  title: schema.string(),
});
