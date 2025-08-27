/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { rawRuleSchemaLatest } from '../raw_rule/latest';

export const rawRuleTemplateSchema = schema.object({
  name: rawRuleSchemaLatest.getPropSchemas().name,
  tags: rawRuleSchemaLatest.getPropSchemas().tags,
  ruleTypeId: rawRuleSchemaLatest.getPropSchemas().alertTypeId,
  consumer: rawRuleSchemaLatest.getPropSchemas().consumer,
  schedule: rawRuleSchemaLatest.getPropSchemas().schedule,
  flapping: rawRuleSchemaLatest.getPropSchemas().flapping,
  alertDelay: rawRuleSchemaLatest.getPropSchemas().alertDelay,
  params: rawRuleSchemaLatest.getPropSchemas().params,
});
