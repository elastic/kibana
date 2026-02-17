/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { rawRuleSchema } from '../raw_rule/v7';

export const rawRuleTemplateSchema = schema.object({
  name: rawRuleSchema.getPropSchemas().name,
  tags: rawRuleSchema.getPropSchemas().tags,
  ruleTypeId: rawRuleSchema.getPropSchemas().alertTypeId,
  schedule: rawRuleSchema.getPropSchemas().schedule,
  flapping: rawRuleSchema.getPropSchemas().flapping,
  alertDelay: rawRuleSchema.getPropSchemas().alertDelay,
  params: rawRuleSchema.getPropSchemas().params,
});
