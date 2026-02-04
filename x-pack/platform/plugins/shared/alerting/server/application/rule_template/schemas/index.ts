/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleSchema } from '../../rule/schemas';

ruleSchema.getPropSchemas();

export const ruleTemplateSchema = schema.object({
  id: schema.string(),
  name: ruleSchema.getPropSchemas().name,
  tags: ruleSchema.getPropSchemas().tags,
  ruleTypeId: ruleSchema.getPropSchemas().alertTypeId,
  schedule: ruleSchema.getPropSchemas().schedule,
  flapping: ruleSchema.getPropSchemas().flapping,
  alertDelay: ruleSchema.getPropSchemas().alertDelay,
  params: ruleSchema.getPropSchemas().params,
  artifacts: ruleSchema.getPropSchemas().artifacts,
  description: schema.maybe(schema.string()),
});
