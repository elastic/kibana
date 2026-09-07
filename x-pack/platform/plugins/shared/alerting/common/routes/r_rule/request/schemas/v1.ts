/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateTimezone } from '../../../rule/validation/validate_timezone/v1';
import {
  validateStartDateV1,
  validateEndDateV1,
  validateRecurrenceByWeekdayV1,
} from '../../validation';

export interface RRuleRequestSchemaLimits {
  /** Max length of the `dtstart` string. Omit for no limit. */
  maxDtstartLength?: number;
  /** Max length of the `tzid` string. Omit for no limit. */
  maxTzidLength?: number;
  /** Max length of the `until` string. Omit for no limit. */
  maxUntilLength?: number;
  /** Max length of each `byweekday` element. Omit for no limit. */
  maxByweekdayLength?: number;
  /** Max number of `byweekday` entries. Omit for no limit. */
  maxByweekday?: number;
  /** Max number of `bymonthday` entries. Omit for no limit. */
  maxBymonthday?: number;
  /** Max number of `bymonth` entries. Omit for no limit. */
  maxBymonth?: number;
}

/**
 * Builds the r_rule request schema. Limits default to unbounded so the
 * shared/public consumers (e.g. the alerting rule APIs and snooze schedules)
 * keep their existing contract. Internal consumers that need request bounds
 * (e.g. the Maintenance Windows internal APIs) pass explicit limits.
 */
export const getRRuleRequestSchema = (limits: RRuleRequestSchemaLimits = {}) =>
  schema.object({
    dtstart: schema.string({ validate: validateStartDateV1, maxLength: limits.maxDtstartLength }),
    tzid: schema.string({ validate: validateTimezone, maxLength: limits.maxTzidLength }),
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
    until: schema.maybe(
      schema.string({ validate: validateEndDateV1, maxLength: limits.maxUntilLength })
    ),
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
      schema.arrayOf(schema.string({ maxLength: limits.maxByweekdayLength }), {
        minSize: 1,
        maxSize: limits.maxByweekday,
        validate: validateRecurrenceByWeekdayV1,
      })
    ),
    bymonthday: schema.maybe(
      schema.arrayOf(schema.number({ min: 1, max: 31 }), {
        minSize: 1,
        maxSize: limits.maxBymonthday,
      })
    ),
    bymonth: schema.maybe(
      schema.arrayOf(schema.number({ min: 1, max: 12 }), { minSize: 1, maxSize: limits.maxBymonth })
    ),
  });

export const rRuleRequestSchema = getRRuleRequestSchema();
