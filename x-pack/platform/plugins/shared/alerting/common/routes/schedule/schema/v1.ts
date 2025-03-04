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
} from '../validation';
import { validateInteger } from '../validation/validate_integer/v1';

export const scheduleRequestSchema = schema.object(
  {
    start: schema.string({
      validate: validateStartDateV1,
      meta: {
        description: 'Start date and time of the schedule in ISO 8601 format.',
      },
    }),
    duration: schema.string({
      validate: validateDurationV1,
      meta: {
        description: `Duration of the schedule. It allows values in <integer><unit> format. <unit> is one of h|m|s for hours, minutes, seconds. Examples: '5h', '30m', '5000s'.`,
      },
    }),
    timezone: schema.maybe(
      schema.string({
        validate: validateTimezoneV1,
        meta: {
          description: 'Timezone of the schedule. The default timezone is UTC.',
        },
      })
    ),
    recurring: schema.maybe(
      schema.object({
        end: schema.maybe(
          schema.string({
            validate: validateEndDateV1,
            meta: {
              description: 'End date of recurrence of the schedule in ISO 8601 format.',
            },
          })
        ),
        every: schema.maybe(
          schema.string({
            validate: validateIntervalAndFrequencyV1,
            meta: {
              description: `Recurrence interval and frequency of the schedule. It allows values in <integer><unit> format. <unit> is one of d|w|M|y for days, weeks, months, years. Example: '15d', '2w', '3m', '1y'.`,
            },
          })
        ),
        onWeekDay: schema.maybe(
          schema.arrayOf(schema.string(), {
            minSize: 1,
            validate: validateOnWeekDayV1,
            meta: {
              description: `Specific days of the week ['MO','TU'...] or nth day of month ['+1MO', '-3FR', '+2WE', '-4SA'] for recurrence of the schedule.`,
            },
          })
        ),
        onMonthDay: schema.maybe(
          schema.arrayOf(
            schema.number({
              min: 1,
              max: 31,
              validate: (value: number) => validateInteger(value, 'onMonthDay'),
            }),
            {
              minSize: 1,
              meta: {
                description:
                  'Specific days of the month for recurrence of the schedule. Valid values are 1-31.',
              },
            }
          )
        ),
        onMonth: schema.maybe(
          schema.arrayOf(
            schema.number({
              min: 1,
              max: 12,
              validate: (value: number) => validateInteger(value, 'onMonth'),
            }),
            {
              minSize: 1,
              meta: {
                description:
                  'Specific months for recurrence of the schedule. Valid values are 1-12.',
              },
            }
          )
        ),
        occurrences: schema.maybe(
          schema.number({
            validate: (occurrences: number) => validateInteger(occurrences, 'occurrences'),
            min: 1,
            meta: {
              description: 'Total number of recurrences of the schedule.',
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
