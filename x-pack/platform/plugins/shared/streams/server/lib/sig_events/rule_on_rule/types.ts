/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const ruleOnRulePathSchema = z.enum(['count-based', 'metric-based', 'unsupported']);

export const ruleOnRulePlanEntrySchema = z.object({
  esql: z.string().min(1),
  metricName: z.string().optional(),
});

export const ruleOnRulePlanSchema = z.object({
  path: ruleOnRulePathSchema,
  rules: z.array(ruleOnRulePlanEntrySchema).min(1),
  reasoning: z.string(),
});

export type RuleOnRulePath = z.infer<typeof ruleOnRulePathSchema>;
export type RuleOnRulePlanEntry = z.infer<typeof ruleOnRulePlanEntrySchema>;
export type RuleOnRulePlan = z.infer<typeof ruleOnRulePlanSchema>;

/** Snapshot of a base rule from alerting workflow lifecycle triggers. */
export interface BaseRuleSnapshot {
  ruleId: string;
  spaceId: string;
  name: string;
  kind: 'alert' | 'signal';
  query: string;
  tags: string[];
  enabled?: boolean;
}
