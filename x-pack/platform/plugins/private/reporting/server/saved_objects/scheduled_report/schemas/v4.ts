/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  rawNotificationSchema as rawNotificationSchemaV1,
  rawEmailNotificationSchema as rawEmailNotificationSchemaV1,
  rawScheduledReportSchema as rawScheduledReportSchemaV3,
} from './v3';
export * from './v3';

export const rawNotificationSchema = rawNotificationSchemaV1.extends({
  email: schema.maybe(
    // This is now nullable to allow removing the email notification altogether
    schema.nullable(
      rawEmailNotificationSchemaV1.extends({
        subject: schema.maybe(schema.string({ maxLength: 1000 })),
        message: schema.maybe(schema.string({ maxLength: 10000 })),
      })
    )
  ),
});

export const rawScheduledReportSchema = rawScheduledReportSchemaV3.extends({
  notification: schema.maybe(rawNotificationSchema),
});
