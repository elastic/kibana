/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FilterStateStore } from '@kbn/es-query';

export const alertsFilterQuerySchema = schema.object({
  kql: schema.string(),
  filters: schema.arrayOf(
    schema.object({
      query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
      meta: schema.recordOf(schema.string(), schema.any()),
      $state: schema.maybe(
        schema.object({
          store: schema.oneOf([
            schema.literal(FilterStateStore.APP_STATE),
            schema.literal(FilterStateStore.GLOBAL_STATE),
          ]),
        })
      ),
    })
  ),
  dsl: schema.maybe(schema.string()),
});

const rRuleSchema = schema.object({
  dtstart: schema.string(),
  tzid: schema.string(),
  freq: schema.maybe(
    schema.oneOf([
      schema.literal(0),
      schema.literal(1),
      schema.literal(2),
      schema.literal(3),
      schema.literal(4),
      schema.literal(5),
      schema.literal(6),
    ])
  ),
  until: schema.maybe(schema.string()),
  count: schema.maybe(schema.number()),
  interval: schema.maybe(schema.number()),
  wkst: schema.maybe(
    schema.oneOf([
      schema.literal('MO'),
      schema.literal('TU'),
      schema.literal('WE'),
      schema.literal('TH'),
      schema.literal('FR'),
      schema.literal('SA'),
      schema.literal('SU'),
    ])
  ),
  byweekday: schema.maybe(schema.arrayOf(schema.oneOf([schema.string(), schema.number()]))),
  bymonth: schema.maybe(schema.number()),
  bysetpos: schema.maybe(schema.number()),
  bymonthday: schema.maybe(schema.number()),
  byyearday: schema.maybe(schema.number()),
  byweekno: schema.maybe(schema.number()),
  byhour: schema.maybe(schema.number()),
  byminute: schema.maybe(schema.number()),
  bysecond: schema.maybe(schema.number()),
});

const rawMaintenanceWindowEventsSchema = schema.object({
  gte: schema.string(),
  lte: schema.string(),
});

export const rawMaintenanceWindowSchema = schema.object({
  categoryIds: schema.maybe(schema.nullable(schema.arrayOf(schema.string()))),
  createdAt: schema.string(),
  createdBy: schema.nullable(schema.string()),
  duration: schema.number(),
  enabled: schema.boolean(),
  events: schema.arrayOf(rawMaintenanceWindowEventsSchema),
  expirationDate: schema.string(),
  rRule: rRuleSchema,
  scopedQuery: schema.maybe(schema.nullable(alertsFilterQuerySchema)),
  title: schema.string(),
  updatedAt: schema.string(),
  updatedBy: schema.nullable(schema.string()),
});
