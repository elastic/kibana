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
} from '../validation';

export const scheduleRequestSchema = schema.object({
  start: schema.string({
    validate: validateStartDateV1,
  }),
  duration: schema.string({ validate: validateDurationV1 }),
  recurring: schema.maybe(
    schema.object({
      end: schema.maybe(schema.string({ validate: validateEndDateV1 })),
      every: schema.maybe(schema.string({ validate: validateIntervalAndFrequencyV1 })),
      onWeekDay: schema.maybe(
        schema.arrayOf(schema.string(), { minSize: 1, validate: validateOnWeekDayV1 })
      ),
      onMonthDay: schema.maybe(schema.arrayOf(schema.number({ min: 1, max: 31 }), { minSize: 1 })),
      onMonth: schema.maybe(schema.arrayOf(schema.number({ min: 1, max: 12 }), { minSize: 1 })),
      occurrences: schema.maybe(
        schema.number({
          validate: (occurrences: number) => {
            if (!Number.isInteger(occurrences)) {
              return 'schedule occurrences must be a positive integer';
            }
          },
          min: 1,
        })
      ),
    })
  ),
});
