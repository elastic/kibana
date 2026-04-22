/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const ruleDoctorSettingsAttributesSchemaV1 = schema.object({
  scheduleEnabled: schema.boolean(),
  scheduleType: schema.oneOf([schema.literal('interval'), schema.literal('rrule')]),
  interval: schema.maybe(schema.string()),
  rrule: schema.maybe(
    schema.object({
      freq: schema.oneOf([
        schema.literal('DAILY'),
        schema.literal('WEEKLY'),
        schema.literal('MONTHLY'),
        schema.literal('YEARLY'),
      ]),
      interval: schema.number(),
      tzid: schema.string(),
      dtstart: schema.maybe(schema.string()),
      byhour: schema.maybe(schema.arrayOf(schema.number())),
      byminute: schema.maybe(schema.arrayOf(schema.number())),
      byweekday: schema.maybe(schema.arrayOf(schema.string())),
      bymonthday: schema.maybe(schema.arrayOf(schema.number())),
      bymonth: schema.maybe(schema.arrayOf(schema.number())),
    })
  ),
});
