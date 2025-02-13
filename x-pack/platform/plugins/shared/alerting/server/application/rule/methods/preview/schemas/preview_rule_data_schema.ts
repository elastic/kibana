/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleParamsSchemaWithDefaultValue } from '@kbn/response-ops-rule-params';
import { actionRequestSchema } from '../../../schemas';
import { validateDuration } from '../../../validation';

export const previewRuleDataSchema = schema.object(
  {
    name: schema.string(),
    alertTypeId: schema.string(),
    consumer: schema.string(),
    tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
    params: ruleParamsSchemaWithDefaultValue,
    schedule: schema.object({
      interval: schema.string({ validate: validateDuration }),
    }),
    actions: schema.arrayOf(actionRequestSchema, {
      defaultValue: [],
    }),
  },
  { unknowns: 'allow' }
);
