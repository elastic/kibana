/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { scheduleRruleSchemaV1 } from '@kbn/task-manager-plugin/server';

const rawLayoutIdSchema = schema.oneOf([
  schema.literal('preserve_layout'),
  schema.literal('print'),
  schema.literal('canvas'),
]);

export const rawNotificationSchema = schema.object({
  email: schema.maybe(
    schema.object(
      {
        to: schema.maybe(schema.arrayOf(schema.string())),
        bcc: schema.maybe(schema.arrayOf(schema.string())),
        cc: schema.maybe(schema.arrayOf(schema.string())),
      },
      {
        validate: (value) => {
          const allEmails = new Set([
            ...(value.to || []),
            ...(value.bcc || []),
            ...(value.cc || []),
          ]);

          if (allEmails.size === 0) {
            return 'At least one email address is required';
          }
        },
      }
    )
  ),
});

export const rawScheduledReportSchema = schema.object({
  createdAt: schema.string(),
  createdBy: schema.string(),
  enabled: schema.boolean(),
  jobType: schema.string(),
  meta: schema.object({
    isDeprecated: schema.maybe(schema.boolean()),
    layout: schema.maybe(rawLayoutIdSchema),
    objectType: schema.string(),
  }),
  migrationVersion: schema.maybe(schema.string()),
  notification: schema.maybe(rawNotificationSchema),
  payload: schema.string(),
  schedule: scheduleRruleSchemaV1,
  title: schema.string(),
});
