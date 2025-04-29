/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { validateBackfillSchedule } from '../../../../..';
import { MAX_SCHEDULE_BACKFILL_BULK_SIZE } from '../../../../../constants';
import { backfillResponseSchemaV1, errorResponseSchemaV1 } from '../../../response';

export const scheduleBodySchema = schema.arrayOf(
  schema.object(
    {
      rule_id: schema.string(),
      ranges: schema.arrayOf(
        schema.object({
          start: schema.string(),
          end: schema.string(),
        })
      ),
      run_actions: schema.maybe(schema.boolean()),
    },
    {
      validate({ ranges }) {
        const errors = ranges
          .map((range) => validateBackfillSchedule(range.start, range.end))
          .filter(Boolean);
        if (errors.length > 0) {
          return errors.join('\n');
        }
      },
    }
  ),
  { minSize: 1, maxSize: MAX_SCHEDULE_BACKFILL_BULK_SIZE }
);

export const scheduleResponseSchema = schema.arrayOf(
  schema.oneOf([backfillResponseSchemaV1, errorResponseSchemaV1])
);
