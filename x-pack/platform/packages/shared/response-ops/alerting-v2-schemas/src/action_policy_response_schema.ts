/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { durationSchema } from './common';
import {
  groupingModeSchema,
  actionPolicyDestinationSchema,
  actionPolicyTypeSchema,
  throttleStrategySchema,
} from './action_policy_data_schema';

export const actionPolicyResponseSchema = z.object({
  id: z.string().describe('The unique identifier for the action policy.'),
  version: z.string().optional().describe('The version, used for optimistic concurrency control.'),
  name: z.string().describe('The name of the action policy.'),
  description: z.string().describe('A description of the action policy.'),
  type: actionPolicyTypeSchema.describe('The action policy type.'),
  ruleId: z
    .string()
    .nullable()
    .describe('The linked rule id when type is "single_rule"; null otherwise.'),
  enabled: z.boolean().describe('Whether the action policy is enabled.'),
  destinations: z.array(actionPolicyDestinationSchema).describe('The list of destinations.'),
  matcher: z.string().nullable().describe('A KQL query to match alerts, or null to match all.'),
  groupBy: z
    .array(z.string())
    .nullable()
    .describe('The fields used to group alerts, or null for no grouping.'),
  tags: z.array(z.string()).nullable().describe('Tags associated with the action policy.'),
  groupingMode: groupingModeSchema
    .nullable()
    .describe('The grouping mode for alert notifications.'),
  throttle: z
    .object({
      strategy: throttleStrategySchema.optional().describe('The throttle strategy.'),
      interval: durationSchema
        .nullable()
        .describe(
          'The throttle interval duration (e.g. 5m, 1h), or null when the strategy is intervalless.'
        ),
    })
    .nullable()
    .describe('The throttle configuration for notifications.'),
  snoozedUntil: z
    .string()
    .nullable()
    .describe('The ISO datetime until which the policy is snoozed, or null if not snoozed.'),
  auth: z
    .object({
      owner: z.string().describe('The owner of the action policy.'),
      createdByUser: z
        .boolean()
        .describe('Whether this policy was created by a user (vs system-generated).'),
    })
    .describe('Authentication and ownership information.'),
  createdBy: z.string().nullable().describe('The user ID who created the action policy.'),
  createdAt: z.string().describe('The ISO datetime when the action policy was created.'),
  updatedBy: z.string().nullable().describe('The user ID who last updated the action policy.'),
  updatedAt: z.string().describe('The ISO datetime when the action policy was last updated.'),
});

export type ActionPolicyResponse = z.infer<typeof actionPolicyResponseSchema>;

export const findActionPoliciesResponseSchema = z
  .object({
    items: z.array(actionPolicyResponseSchema).describe('The list of action policies.'),
    total: z.number().describe('The total number of action policies matching the query.'),
    page: z.number().describe('The current page number.'),
    perPage: z.number().describe('The number of action policies per page.'),
  })
  .describe('Paginated list of action policies.');

export type FindActionPoliciesResponse = z.infer<typeof findActionPoliciesResponseSchema>;

export const bulkActionActionPoliciesResponseSchema = z
  .object({
    processed: z.number().describe('The number of action policies processed.'),
    total: z.number().describe('The total number of action policies targeted.'),
    errors: z
      .array(
        z.object({
          id: z.string().describe('The identifier of the action policy that failed.'),
          message: z.string().describe('The error message.'),
        })
      )
      .describe('Errors encountered during the bulk operation.'),
  })
  .describe('Result of a bulk action policy operation.');

export type BulkActionActionPoliciesResponse = z.infer<
  typeof bulkActionActionPoliciesResponseSchema
>;
