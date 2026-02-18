/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { scheduleRruleSchemaV3 as scheduleRruleSchema } from '@kbn/task-manager-plugin/server';
import { rawRuleSchema as rawRuleSchemaV9 } from './v9';

export const rawRuleSchema = rawRuleSchemaV9.extends({
  schedule: schema.oneOf([
    schema.object({
      interval: schema.string(),
      rrule: schema.never(),
    }),
    scheduleRruleSchema.extends({
      interval: schema.never(),
    }),
  ]),
});
