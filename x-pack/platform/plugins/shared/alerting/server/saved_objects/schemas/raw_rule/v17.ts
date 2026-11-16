/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scheduleRruleSchemaV3 } from '@kbn/task-manager-plugin/server';
import { schema } from '@kbn/config-schema';
import { rawRuleSchema as rawRuleSchemaV16 } from './v16';

// A rule is scheduled either by interval or by rrule, never by both.
// schema.object rejects unknown keys, so an object carrying both fails every branch.
export const rawRuleSchema = rawRuleSchemaV16.extends({
  schedule: schema.oneOf([
    schema.object({
      interval: schema.string(),
    }),
    scheduleRruleSchemaV3,
  ]),
});
