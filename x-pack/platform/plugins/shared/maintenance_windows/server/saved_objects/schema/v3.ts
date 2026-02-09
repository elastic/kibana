/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { alertsFilterQuerySchema, rawMaintenanceWindowEventsSchema } from './v1';
import { scheduleSchema } from './v2';

export const rawMaintenanceWindowSchema = schema.object({
  createdAt: schema.string(),
  createdBy: schema.nullable(schema.string()),
  enabled: schema.boolean(),
  events: schema.arrayOf(rawMaintenanceWindowEventsSchema),
  expirationDate: schema.string(),
  title: schema.string(),
  updatedAt: schema.string(),
  updatedBy: schema.nullable(schema.string()),
  schedule: schema.object({
    custom: scheduleSchema,
  }),
  scope: schema.maybe(schema.object({ alerting: schema.nullable(alertsFilterQuerySchema) })),
});
