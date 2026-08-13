/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { actionPolicyResponseSchema } from './action_policy_response_schema';

const tagItemSchema = z.string().min(1).max(256);

export const matchActionPoliciesForRuleBodySchema = z
  .object({
    rule: z
      .object({
        id: z.string().min(1).max(256).optional().describe('The ID of the rule.'),
        name: z
          .string()
          .min(1)
          .max(256)
          .optional()
          .describe('The name of the rule, used to evaluate global matcher expressions.'),
        tags: z
          .array(tagItemSchema)
          .max(100)
          .optional()
          .describe('The tags of the rule, used to evaluate global matcher expressions.'),
      })
      .strict()
      .optional(),
  })
  .strict();

export type MatchActionPoliciesForRuleBody = z.infer<typeof matchActionPoliciesForRuleBodySchema>;

export const matchedActionPolicyCategorySchema = z
  .enum(['global', 'global-filtered'])
  .describe(
    'Why this action policy matches the rule: "global" (applies to all rules, no filter), or "global-filtered" (applies to all rules, KQL filter evaluated to true).'
  );

export type MatchedActionPolicyCategory = z.infer<typeof matchedActionPolicyCategorySchema>;

export const matchedActionPolicySchema = z
  .object({
    actionPolicy: actionPolicyResponseSchema.describe('The matched action policy.'),
    category: matchedActionPolicyCategorySchema,
  })
  .describe('An action policy that matches a rule, along with the reason it matched.');

export type MatchedActionPolicy = z.infer<typeof matchedActionPolicySchema>;

export const matchActionPoliciesForRuleResponseSchema = z
  .object({
    items: z.array(matchedActionPolicySchema).describe('The list of matched action policies.'),
    total: z
      .number()
      .int()
      .min(0)
      .describe(
        'Total number of action policies in the space. If greater than the number evaluated, the match results may be incomplete.'
      ),
  })
  .describe('Action policies that match a given rule, grouped by match category.');

export type MatchActionPoliciesForRuleResponse = z.infer<
  typeof matchActionPoliciesForRuleResponseSchema
>;
