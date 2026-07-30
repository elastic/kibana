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

/**
 * Alerting v2 rule template attributes.
 *
 * Create-rule fields are nested under `rule` so template storage can evolve
 * independently of top-level SO metadata (`engine`).
 */
export const ruleTemplateDataSchema = z
  .object({
    engine: engineField,
    rule: createRuleDataBaseSchema,
  })
  .strict()
  .describe('Alerting v2 rule template attributes.');

export type RuleTemplateData = z.infer<typeof ruleTemplateDataSchema>;
