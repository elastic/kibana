/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { actionPolicyResponseSchema } from './action_policy_response_schema';
import { tagsSchema } from './common';

export const matchActionPoliciesBodySchema = z
  .object({
    rule: z
      .object({
        tags: tagsSchema
          .optional()
          .describe(
            'Tags of the rule you want to check. The response includes policies whose `matcher.tags` contain at least one of the tags in this list, along with policies that apply to every rule.'
          ),
      })
      .strict()
      .optional(),
  })
  .strict()
  .meta({ id: 'alerting_match_action_policies_request' });

export type MatchActionPoliciesBody = z.infer<typeof matchActionPoliciesBodySchema>;

export const matchedActionPolicyCategorySchema = z
  .enum(['catch_all', 'tags'])
  .describe(
    "The reason this policy applies to the rule. `catch_all` means the policy has neither `matcher.tags` nor `matcher.expression`, so it applies to every rule. `tags` means the rule has at least one tag listed in the policy's `matcher.tags`."
  );

export type MatchedActionPolicyCategory = z.infer<typeof matchedActionPolicyCategorySchema>;

export const matchedActionPolicySchema = z
  .object({
    action_policy: actionPolicyResponseSchema.describe('The matched action policy.'),
    category: matchedActionPolicyCategorySchema,
  })
  .describe('An action policy that matches a rule, along with the reason it matched.')
  .meta({ id: 'alerting_matched_action_policy' });

export type MatchedActionPolicy = z.infer<typeof matchedActionPolicySchema>;

export const matchActionPoliciesResponseSchema = z
  .object({
    items: z.array(matchedActionPolicySchema).describe('The list of matched action policies.'),
    evaluated_count: z
      .number()
      .int()
      .min(0)
      .describe(
        'Number of action policies evaluated for a match, including policies that did not match.'
      ),
    is_truncated: z
      .boolean()
      .describe(
        'Whether the space holds more action policies than were evaluated, meaning the match results may be incomplete.'
      ),
  })
  .describe('Action policies that match a given rule, grouped by match category.')
  .meta({ id: 'alerting_match_action_policies_response' });

export type MatchActionPoliciesResponse = z.infer<typeof matchActionPoliciesResponseSchema>;
