/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const rRuleResponseSchema = schema.object({
  dtstart: schema.string({
    meta: {
      description: 'Rule start date in Coordinated Universal Time (UTC).',
    },
  }),
  tzid: schema.string({
    meta: {
      description: 'Indicates timezone abbreviation.',
    },
  }),
  freq: schema.maybe(
    schema.oneOf(
      [
        schema.literal(0),
        schema.literal(1),
        schema.literal(2),
        schema.literal(3),
        schema.literal(4),
        schema.literal(5),
        schema.literal(6),
      ],
      {
        meta: {
          description:
            'Indicates frequency of the rule. Options are YEARLY, MONTHLY, WEEKLY, DAILY.',
        },
      }
    )
  ),
  until: schema.maybe(
    schema.string({
      meta: {
        description: 'Recur the rule until this date.',
      },
    })
  ),
  count: schema.maybe(
    schema.number({
      meta: {
        description: 'Number of times the rule should recur until it stops.',
      },
    })
  ),
  interval: schema.maybe(
    schema.number({
      meta: {
        description:
          'Indicates the interval of frequency. For example, 1 and YEARLY is every 1 year, 2 and WEEKLY is every 2 weeks.',
      },
    })
  ),
  wkst: schema.maybe(
    schema.oneOf(
      [
        schema.literal('MO'),
        schema.literal('TU'),
        schema.literal('WE'),
        schema.literal('TH'),
        schema.literal('FR'),
        schema.literal('SA'),
        schema.literal('SU'),
      ],
      {
        meta: {
          description: 'Indicates the start of week, defaults to Monday.',
        },
      }
    )
  ),
  byweekday: schema.maybe(
    schema.nullable(
      schema.arrayOf(
        schema.oneOf([schema.string(), schema.number()], {
          meta: {
            description:
              'Indicates the days of the week to recur or else nth-day-of-month strings. For example, "+2TU" second Tuesday of month, "-1FR" last Friday of the month, which are internally converted to a `byweekday/bysetpos` combination.',
          },
        })
      )
    )
  ),
  bymonth: schema.maybe(
    schema.nullable(
      schema.arrayOf(
        schema.number({
          meta: {
            description: 'Indicates months of the year that this rule should recur.',
          },
        })
      )
    )
  ),
  bysetpos: schema.maybe(
    schema.nullable(
      schema.arrayOf(
        schema.number({
          meta: {
            description:
              'A positive or negative integer affecting the nth day of the month. For example, -2 combined with `byweekday` of FR is 2nd to last Friday of the month. It is recommended to not set this manually and just use `byweekday`.',
          },
        })
      )
    )
  ),
  bymonthday: schema.maybe(
    schema.nullable(
      schema.arrayOf(
        schema.number({
          meta: {
            description: 'Indicates the days of the month to recur.',
          },
        })
      )
    )
  ),
  byyearday: schema.maybe(
    schema.nullable(
      schema.arrayOf(
        schema.number({
          meta: {
            description: 'Indicates the days of the year that this rule should recur.',
          },
        })
      )
    )
  ),
  byweekno: schema.maybe(
    schema.nullable(
      schema.arrayOf(
        schema.number({
          meta: {
            description: 'Indicates number of the week hours to recur.',
          },
        })
      )
    )
  ),
  byhour: schema.maybe(
    schema.nullable(
      schema.arrayOf(
        schema.number({
          meta: {
            description: 'Indicates hours of the day to recur.',
          },
        })
      )
    )
  ),
  byminute: schema.maybe(
    schema.nullable(
      schema.arrayOf(
        schema.number({
          meta: {
            description: 'Indicates minutes of the hour to recur.',
          },
        })
      )
    )
  ),
  bysecond: schema.maybe(
    schema.nullable(
      schema.arrayOf(
        schema.number({
          meta: {
            description: 'Indicates seconds of the day to recur.',
          },
        })
      )
    )
  ),
});
