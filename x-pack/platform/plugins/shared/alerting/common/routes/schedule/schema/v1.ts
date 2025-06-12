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
        description:
          'The start date and time of the schedule, provided in ISO 8601 format and set to the UTC timezone. For example: `2025-03-12T12:00:00.000Z`.',
      },
    }),
    duration: schema.string({
      validate: validateDurationV1,
      meta: {
        description:
          'The duration of the schedule. It allows values in `<integer><unit>` format. `<unit>` is one of `d`, `h`, `m`, or `s` for hours, minutes, seconds. For example: `1d`, `5h`, `30m`, `5000s`.',
      },
    }),
    timezone: schema.maybe(
      schema.string({
        validate: validateTimezoneV1,
        meta: {
          description: 'The timezone of the schedule. The default timezone is UTC.',
        },
      })
    ),
    recurring: schema.maybe(
      schema.object({
        end: schema.maybe(
          schema.string({
            validate: validateEndDateV1,
            meta: {
              description:
                'The end date of a recurring schedule, provided in ISO 8601 format and set to the UTC timezone. For example: `2025-04-01T00:00:00.000Z`.',
            },
          })
        ),
        every: schema.maybe(
          schema.string({
            validate: validateIntervalAndFrequencyV1,
            meta: {
              description:
                'The interval and frequency of a recurring schedule. It allows values in `<integer><unit>` format. `<unit>` is one of `d`, `w`, `M`, or `y` for days, weeks, months, years. For example: `15d`, `2w`, `3m`, `1y`.',
            },
          })
        ),
        onWeekDay: schema.maybe(
          schema.arrayOf(schema.string(), {
            minSize: 1,
            validate: validateOnWeekDayV1,
            meta: {
              description:
                'The specific days of the week (`[MO,TU,WE,TH,FR,SA,SU]`) or nth day of month (`[+1MO, -3FR, +2WE, -4SA, -5SU]`) for a recurring schedule.',
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
                  'The specific days of the month for a recurring schedule. Valid values are 1-31.',
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
                description: 'The specific months for a recurring schedule. Valid values are 1-12.',
              },
            }
          )
        ),
        occurrences: schema.maybe(
          schema.number({
            validate: (occurrences: number) => validateInteger(occurrences, 'occurrences'),
            min: 1,
            meta: {
              description: 'The total number of recurrences of the schedule.',
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

// The response schema has the same fields but without validation
export const scheduleResponseSchema = schema.object({
  start: schema.string({
    meta: {
      description:
        'The start date and time of the schedule, provided in ISO 8601 format and set to the UTC timezone. For example: `2025-03-12T12:00:00.000Z`.',
    },
  }),
  duration: schema.string({
    meta: {
      description:
        'The duration of the schedule. It allows values in `<integer><unit>` format. `<unit>` is one of `d`, `h`, `m`, or `s` for hours, minutes, seconds. For example: `1d`, `5h`, `30m`, `5000s`.',
    },
  }),
  timezone: schema.maybe(
    schema.string({
      meta: {
        description: 'The timezone of the schedule. The default timezone is UTC.',
      },
    })
  ),
  recurring: schema.maybe(
    schema.object({
      end: schema.maybe(
        schema.string({
          meta: {
            description:
              'The end date of a recurring schedule, provided in ISO 8601 format and set to the UTC timezone. For example: `2025-04-01T00:00:00.000Z`.',
          },
        })
      ),
      every: schema.maybe(
        schema.string({
          meta: {
            description:
              'The interval and frequency of a recurring schedule. It allows values in `<integer><unit>` format. `<unit>` is one of `d`, `w`, `M`, or `y` for days, weeks, months, years. For example: `15d`, `2w`, `3m`, `1y`.',
          },
        })
      ),
      onWeekDay: schema.maybe(
        schema.arrayOf(schema.string(), {
          meta: {
            description:
              'The specific days of the week (`[MO,TU,WE,TH,FR,SA,SU]`) or nth day of month (`[+1MO, -3FR, +2WE, -4SA, -5SU]`) for a recurring schedule.',
          },
        })
      ),
      onMonthDay: schema.maybe(
        schema.arrayOf(schema.number(), {
          meta: {
            description:
              'The specific days of the month for a recurring schedule. Valid values are 1-31.',
          },
        })
      ),
      onMonth: schema.maybe(
        schema.arrayOf(schema.number(), {
          meta: {
            description: 'The specific months for a recurring schedule. Valid values are 1-12.',
          },
        })
      ),
      occurrences: schema.maybe(
        schema.number({
          meta: {
            description: 'The total number of recurrences of the schedule.',
          },
        })
      ),
    })
  ),
});
