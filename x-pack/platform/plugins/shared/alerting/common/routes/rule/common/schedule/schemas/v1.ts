/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rruleStringSchemaV1 } from '@kbn/response-ops-schedule-schema';
import {
  RRULE_STRING_DESCRIPTION,
  RRULE_STRING_MAX_LENGTH,
} from '@kbn/response-ops-scheduling-utils';
import { validateDurationV1 } from '../../../validation';

const INTERVAL_DESCRIPTION = 'The interval is specified in seconds, minutes, hours, or days.';
const SCHEDULE_DESCRIPTION =
  'The schedule, which specifies how frequently the rule conditions are checked. Set either `interval` or `rrule`, not both.';

export const ruleScheduleRequestSchema = schema.oneOf(
  [
    schema.object({
      interval: schema.string({
        validate: validateDurationV1,
        meta: { description: INTERVAL_DESCRIPTION },
      }),
    }),
    schema.object({
      rrule: rruleStringSchemaV1,
    }),
  ],
  { meta: { description: SCHEDULE_DESCRIPTION } }
);

export const ruleScheduleResponseSchema = schema.oneOf(
  [
    schema.object({
      interval: schema.string({ meta: { description: INTERVAL_DESCRIPTION } }),
    }),
    schema.object({
      rrule: schema.string({
        maxLength: RRULE_STRING_MAX_LENGTH,
        meta: { description: RRULE_STRING_DESCRIPTION },
      }),
    }),
  ],
  { meta: { description: SCHEDULE_DESCRIPTION } }
);
