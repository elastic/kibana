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
  validateEveryV1,
  validateOnWeekDayV1,
} from '../validation';

export const scheduleRequestSchema = schema.object({
  duration: schema.number(),
  start: schema.string({
    validate: validateStartDateV1,
  }),
  recurring: schema.maybe(
    schema.object({
      end: schema.maybe(schema.string({ validate: validateEndDateV1 })),
      every: schema.maybe(schema.string({ validate: validateEveryV1 })),
      onWeekDay: schema.maybe(
        schema.arrayOf(schema.string(), { minSize: 1, validate: validateOnWeekDayV1 })
      ),
      onMonthDay: schema.maybe(schema.arrayOf(schema.number({ min: 1, max: 31 }), { minSize: 1 })),
      onMonth: schema.maybe(schema.arrayOf(schema.number({ min: 1, max: 12 }), { minSize: 1 })),
      occurrences: schema.maybe(
        schema.number({
          validate: (occurrences: number) => {
            if (!Number.isInteger(occurrences)) {
              return 'schedule occurrences must be an integer greater than 0';
            }
          },
          min: 1,
        })
      ),
    })
  ),
});
