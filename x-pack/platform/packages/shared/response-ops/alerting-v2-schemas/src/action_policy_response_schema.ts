/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { actorSchema, ESTIMATED_COUNT_NOTE } from './common';
import {
  groupingModeSchema,
  actionPolicyDestinationSchema,
  throttleSchema,
} from './action_policy_data_schema';
import { POLICY_MATCHER_DESCRIPTION, policyMatcherSchema } from './policy_matcher_schema';

export const actionPolicyResponseSchema = z
  .object({
    id: z.string().describe('The unique identifier for the action policy.'),
    name: z.string().describe('The name of the action policy.'),
    description: z
      .string()
      .optional()
      .describe('A description of the action policy. Omitted when the policy has none.'),
    enabled: z.boolean().describe('Whether the action policy is enabled.'),
    destinations: z.array(actionPolicyDestinationSchema).describe('The list of destinations.'),
    matcher: policyMatcherSchema.optional().describe(POLICY_MATCHER_DESCRIPTION),
    group_by: z
      .array(z.string())
      .optional()
      .describe('The fields used to group alerts. Omitted when the alerts are not grouped.'),
    grouping_mode: groupingModeSchema
      .optional()
      .describe('The grouping mode for alert notifications. Omitted when none is set.'),
    throttle: throttleSchema
      .optional()
      .describe('The throttle configuration for notifications. Omitted when none is set.'),
    snoozed_until: z
      .string()
      .optional()
      .describe(
        'The ISO datetime until which the policy is snoozed. Omitted when the policy is not snoozed.'
      ),
    created_by: actorSchema.nullable().describe('The actor who created the action policy.'),
    created_at: z.iso.datetime().describe('The ISO datetime when the action policy was created.'),
    updated_by: actorSchema.nullable().describe('The actor who last updated the action policy.'),
    updated_at: z.iso
      .datetime()
      .describe('The ISO datetime when the action policy was last updated.'),
  })
  .meta({ id: 'alerting_action_policy_response' });

export type ActionPolicyResponse = z.infer<typeof actionPolicyResponseSchema>;

export const findActionPoliciesResponseSchema = z
  .object({
    items: z.array(actionPolicyResponseSchema).describe('The list of action policies.'),
    total: z
      .number()
      .describe(`The number of action policies matching the query. ${ESTIMATED_COUNT_NOTE}`),
    page: z.number().describe('The current page number.'),
    per_page: z.number().describe('The number of action policies per page.'),
  })
  .describe('Paginated list of action policies.')
  .meta({ id: 'alerting_action_policy_list_response' });

export type FindActionPoliciesResponse = z.infer<typeof findActionPoliciesResponseSchema>;
