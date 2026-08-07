/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createRuleDataBaseSchema } from './rule_data_schema';

const engineField = z
  .literal('v2')
  .describe('The alerting engine this template targets. Always "v2" for v2 templates.');

export const ruleTemplateDataSchema = createRuleDataBaseSchema
  .extend({
    engine: engineField,
  })
  .strict()
  .describe('Alerting v2 rule template attributes.');

export type RuleTemplateData = z.infer<typeof ruleTemplateDataSchema>;
