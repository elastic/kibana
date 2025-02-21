/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  validateStartDateV1,
  validateEndDateV1,
  validateIntervalAndFrequencyV1,
  validateOnWeekDayV1,
  validateDurationV1,
  validateTimezoneV1,
  validateScheduleV1,
} from '../../validation';

export const scheduleRequestSchema = schema.object(
  {
    start: schema.string({
      validate: validateStartDateV1,
      meta: {
        description: 'Start date and time of the snooze schedule in ISO 8601 format.',
      },
    }),
    duration: schema.string({
      validate: validateDurationV1,
      meta: {
        description: 'Duration of the snooze schedule.',
      },
    }),
    timezone: schema.maybe(
      schema.string({
        validate: validateTimezoneV1,
        meta: {
          description: 'Timezone of the snooze schedule.',
        },
      })
    ),
    recurring: schema.maybe(
      schema.object({
        end: schema.maybe(
          schema.string({
            validate: validateEndDateV1,
            meta: {
              description: 'End date of recurrence of the snooze schedule in ISO 8601 format.',
            },
          })
        ),
        every: schema.maybe(
          schema.string({
            validate: validateIntervalAndFrequencyV1,
            meta: {
              description: 'Recurrence interval and frequency of the snooze schedule.',
            },
          })
        ),
        onWeekDay: schema.maybe(
          schema.arrayOf(schema.string(), {
            minSize: 1,
            validate: validateOnWeekDayV1,
            meta: {
              description:
                'Specific days of the week or nth day of month for recurrence of the snooze schedule.',
            },
          })
        ),
        onMonthDay: schema.maybe(
          schema.arrayOf(schema.number({ min: 1, max: 31 }), {
            minSize: 1,
            meta: {
              description: 'Specific days of the month for recurrence of the snooze schedule.',
            },
          })
        ),
        onMonth: schema.maybe(
          schema.arrayOf(schema.number({ min: 1, max: 12 }), {
            minSize: 1,
            meta: {
              description: 'Specific months for recurrence of the snooze schedule.',
            },
          })
        ),
        occurrences: schema.maybe(
          schema.number({
            validate: (occurrences: number) => {
              if (!Number.isInteger(occurrences)) {
                return 'schedule occurrences must be a positive integer';
              }
            },
            min: 1,
            meta: {
              description: 'Total number of recurrences of the snooze schedule.',
            },
          })
        ),
      })
    ),
  },
  {
    validate: validateScheduleV1,
  }
);
