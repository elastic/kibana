/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';

export const snoozeRuleParamsExamples = () => path.join(__dirname, 'examples_snooze_rule.yaml');
import { scheduleRequestSchemaV1 } from '../../../../../schedule';

export const snoozeParamsSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'Identifier of the rule.',
    },
  }),
});

export const snoozeBodySchema = schema.object({
  schedule: schema.object({
    custom: schema.maybe(scheduleRequestSchemaV1),
  }),
});

export const snoozeResponseSchema = schema.object({
  body: schema.object({
    schedule: schema.object({
      id: schema.string({
        meta: {
          description: 'Identifier of the snooze schedule.',
        },
      }),
      custom: schema.maybe(scheduleRequestSchemaV1),
    }),
  }),
});
