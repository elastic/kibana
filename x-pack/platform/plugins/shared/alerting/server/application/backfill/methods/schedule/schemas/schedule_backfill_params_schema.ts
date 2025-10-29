/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateBackfillSchedule } from '../../../../../../common';
import { MAX_SCHEDULE_BACKFILL_BULK_SIZE } from '../../../../../../common/constants';

export const scheduleBackfillParamSchema = schema.object(
  {
    ruleId: schema.string(),
    ranges: schema.arrayOf(
      schema.object({
        start: schema.string(),
        end: schema.string(),
      })
    ),
    runActions: schema.maybe(schema.boolean()),
  },
  {
    validate({ ranges }) {
      const errors = ranges
        .map((range) => validateBackfillSchedule(range.start, range.end))
        .filter(Boolean)
        .join('\n');
      if (errors.length > 0) {
        return errors;
      }
    },
  }
);

export const scheduleBackfillParamsSchema = schema.arrayOf(scheduleBackfillParamSchema, {
  minSize: 1,
  maxSize: MAX_SCHEDULE_BACKFILL_BULK_SIZE,
});
