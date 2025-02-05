/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { alertsFilterQuerySchemaV1 } from '../../../../../alerts_filter_query';

// TODO schedule schema
const scheduleSchema = schema.object({
  duration: schema.number(),
  start: schema.string(),
  recurring: schema.maybe(
    schema.object({
      end: schema.maybe(schema.string()),
      every: schema.maybe(schema.string()),
      onWeekDay: schema.maybe(schema.arrayOf(schema.string())),
      onMonthDay: schema.maybe(schema.arrayOf(schema.number())),
      onMonth: schema.maybe(schema.arrayOf(schema.string())),
      occurrences: schema.maybe(schema.number()),
    })
  ),
});

export const bodySchema = schema.object({
  title: schema.string(),
  scope: schema.maybe(schema.nullable(alertsFilterQuerySchemaV1)),
});

export const createMaintenanceWindowRequestBodySchema = schema.intersection([
  bodySchema,
  scheduleSchema,
]);
