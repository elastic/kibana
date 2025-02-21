/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const scheduleResponseSchema = schema.arrayOf(
  schema.object({
    id: schema.maybe(
      schema.string({
        meta: {
          description: 'Identifier of the snooze schedule.',
        },
      })
    ),
    start: schema.string({
      meta: {
        description: 'Start date and time of the snooze schedule in ISO 8601 format.',
      },
    }),
    duration: schema.string({
      meta: {
        description: 'Duration of the snooze schedule.',
      },
    }),
    timezone: schema.maybe(
      schema.string({
        meta: {
          description: 'Timezone of the snooze schedule.',
        },
      })
    ),
    recurring: schema.maybe(
      schema.object({
        end: schema.maybe(
          schema.string({
            meta: {
              description: 'End date of recurrence of the snooze schedule in ISO 8601 format.',
            },
          })
        ),
        every: schema.maybe(
          schema.string({
            meta: {
              description: 'Recurrence interval and frequency of the snooze schedule.',
            },
          })
        ),
        onWeekDay: schema.maybe(
          schema.arrayOf(schema.string(), {
            meta: {
              description:
                'Specific days of the week or nth day of month for recurrence of the snooze schedule.',
            },
          })
        ),
        onMonthDay: schema.maybe(
          schema.arrayOf(schema.number(), {
            meta: {
              description: 'Specific days of the month for recurrence of the snooze schedule.',
            },
          })
        ),
        onMonth: schema.maybe(
          schema.arrayOf(schema.number(), {
            meta: {
              description: 'Specific months for recurrence of the snooze schedule.',
            },
          })
        ),
        occurrences: schema.maybe(
          schema.number({
            meta: {
              description: 'Total number of recurrences of the snooze schedule.',
            },
          })
        ),
      })
    ),
  })
);
