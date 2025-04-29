/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { createValidateRruleBy } from '../../lib/validate_rrule_by';
import { validateSnoozeStartDate, validateSnoozeEndDate } from '../../lib/validate_snooze_date';

export const rRuleSchema = schema.object({
  dtstart: schema.string({ validate: validateSnoozeStartDate }),
  tzid: schema.string(),
  freq: schema.maybe(
    schema.oneOf([schema.literal(0), schema.literal(1), schema.literal(2), schema.literal(3)])
  ),
  interval: schema.maybe(
    schema.number({
      validate: (interval: number) => {
        if (!Number.isInteger(interval)) {
          return 'rRule interval must be an integer greater than 0';
        }
      },
      min: 1,
    })
  ),
  until: schema.maybe(schema.string({ validate: validateSnoozeEndDate })),
  count: schema.maybe(
    schema.number({
      validate: (count: number) => {
        if (!Number.isInteger(count)) {
          return 'rRule count must be an integer greater than 0';
        }
      },
      min: 1,
    })
  ),
  byweekday: schema.maybe(
    schema.arrayOf(schema.string(), {
      validate: createValidateRruleBy('byweekday'),
    })
  ),
  bymonthday: schema.maybe(
    schema.arrayOf(schema.number(), {
      validate: createValidateRruleBy('bymonthday'),
    })
  ),
  bymonth: schema.maybe(
    schema.arrayOf(schema.number(), {
      validate: createValidateRruleBy('bymonth'),
    })
  ),
});
