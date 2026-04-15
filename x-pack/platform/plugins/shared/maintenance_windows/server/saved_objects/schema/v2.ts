/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  alertsFilterQuerySchema,
  rawMaintenanceWindowSchema as rawMaintenanceWindowSchemaV1,
} from './v1';

const scheduleSchema = schema.object({
  start: schema.string(),
  duration: schema.string(),
  timezone: schema.maybe(schema.string()),
  recurring: schema.maybe(
    schema.object({
      end: schema.maybe(schema.string()),
      every: schema.maybe(schema.string()),
      onWeekDay: schema.maybe(schema.arrayOf(schema.string())),
      onMonthDay: schema.maybe(schema.arrayOf(schema.number())),
      onMonth: schema.maybe(schema.arrayOf(schema.number())),
      occurrences: schema.maybe(schema.number()),
    })
  ),
});

export const rawMaintenanceWindowSchema = rawMaintenanceWindowSchemaV1.extends({
  schedule: schema.object({
    custom: scheduleSchema,
  }),
  scope: schema.maybe(schema.object({ alerting: schema.nullable(alertsFilterQuerySchema) })),
});
