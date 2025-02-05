/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { maintenanceWindowStatus as maintenanceWindowStatusV1 } from '../constants/v1';

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

// TO REVIEW
const maintenanceWindowResponseFieldsSchema = schema.object({
  id: schema.string(),
  title: schema.string(),
  enabled: schema.boolean(),
  expiration_date: schema.string(),

  created_by: schema.nullable(schema.string()),
  updated_by: schema.nullable(schema.string()),
  created_at: schema.string(),
  updated_at: schema.string(),

  status: schema.oneOf([
    schema.literal(maintenanceWindowStatusV1.RUNNING),
    schema.literal(maintenanceWindowStatusV1.UPCOMING),
    schema.literal(maintenanceWindowStatusV1.FINISHED),
    schema.literal(maintenanceWindowStatusV1.ARCHIVED),
  ]),

  scope: schema.maybe(
    schema.object({
      query: schema.object({
        kql: schema.string({
          meta: { description: 'A filter written in Kibana Query Language (KQL).' },
        }),
      }),
    })
  ),
});

export const maintenanceWindowResponseSchema = schema.intersection([
  maintenanceWindowResponseFieldsSchema,
  scheduleSchema,
]);
