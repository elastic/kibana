/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDurationV1 } from '../../../../../../common/routes/rule/validation';

export const updateESQLRuleDataSchema = schema.object({
  name: schema.string(),
  tags: schema.arrayOf(schema.string()),
  schedule: schema.string({ validate: validateDurationV1 }),
  enabled: schema.boolean(),
  esql: schema.string(),
  lookbackWindow: schema.string({ validate: validateDurationV1 }),
  timeField: schema.string(),
  groupKey: schema.arrayOf(schema.string()),
});
