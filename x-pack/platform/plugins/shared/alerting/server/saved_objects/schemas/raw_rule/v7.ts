/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleSchema as rawRuleSchemaV6 } from './v6';

export const lastGapAutoFillSchema = schema.object({
  checkTime: schema.string(),
  status: schema.oneOf([schema.literal('success'), schema.literal('failure')]),
  errorMessage: schema.maybe(schema.string()),
});

export const rawRuleSchema = rawRuleSchemaV6.extends({
  lastGapAutoFill: schema.maybe(schema.nullable(lastGapAutoFillSchema)),
});
