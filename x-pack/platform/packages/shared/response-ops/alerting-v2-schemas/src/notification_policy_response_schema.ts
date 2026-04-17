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
  notificationPolicyDestinationSchema,
  throttleStrategySchema,
} from './notification_policy_data_schema';

export const notificationPolicyResponseSchema = z.object({
  id: z.string().describe('The unique identifier for the notification policy.'),
  version: z.string().optional().describe('The version, used for optimistic concurrency control.'),
  name: z.string().describe('The name of the notification policy.'),
  description: z.string().describe('A description of the notification policy.'),
  enabled: z.boolean().describe('Whether the notification policy is enabled.'),
  destinations: z
    .array(notificationPolicyDestinationSchema)
    .describe('The list of notification destinations.'),
  matcher: z.string().nullable().describe('A KQL query to match alerts, or null to match all.'),
  groupBy: z
    .array(z.string())
    .nullable()
    .describe('The fields used to group alerts, or null for no grouping.'),
  tags: z.array(z.string()).nullable().describe('Tags associated with the notification policy.'),
  groupingMode: groupingModeSchema
    .nullable()
    .describe('The grouping mode for alert notifications.'),
  throttle: z
    .object({
      strategy: throttleStrategySchema.optional().describe('The throttle strategy.'),
      interval: durationSchema.optional().describe('The throttle interval duration (e.g. 5m, 1h).'),
    })
    .nullable()
    .describe('The throttle configuration for notifications.'),
  snoozedUntil: z
    .string()
    .nullable()
    .describe('The ISO datetime until which the policy is snoozed, or null if not snoozed.'),
  auth: z
    .object({
      owner: z.string().describe('The owner of the notification policy.'),
      createdByUser: z
        .boolean()
        .describe('Whether this policy was created by a user (vs system-generated).'),
    })
    .describe('Authentication and ownership information.'),
  createdBy: z.string().nullable().describe('The user ID who created the notification policy.'),
  createdByUsername: z.string().nullable().describe('The username of the creator.'),
  createdAt: z.string().describe('The ISO datetime when the notification policy was created.'),
  updatedBy: z
    .string()
    .nullable()
    .describe('The user ID who last updated the notification policy.'),
  updatedByUsername: z.string().nullable().describe('The username of the last updater.'),
  updatedAt: z.string().describe('The ISO datetime when the notification policy was last updated.'),
});

export type NotificationPolicyResponse = z.infer<typeof notificationPolicyResponseSchema>;

export const findNotificationPoliciesResponseSchema = z
  .object({
    items: z.array(notificationPolicyResponseSchema).describe('The list of notification policies.'),
    total: z.number().describe('The total number of notification policies matching the query.'),
    page: z.number().describe('The current page number.'),
    perPage: z.number().describe('The number of notification policies per page.'),
  })
  .describe('Paginated list of notification policies.');

export type FindNotificationPoliciesResponse = z.infer<
  typeof findNotificationPoliciesResponseSchema
>;

export const bulkActionNotificationPoliciesResponseSchema = z
  .object({
    processed: z.number().describe('The number of notification policies processed.'),
    total: z.number().describe('The total number of notification policies targeted.'),
    errors: z
      .array(
        z.object({
          id: z.string().describe('The identifier of the notification policy that failed.'),
          message: z.string().describe('The error message.'),
        })
      )
      .describe('Errors encountered during the bulk operation.'),
  })
  .describe('Result of a bulk notification policy operation.');

export type BulkActionNotificationPoliciesResponse = z.infer<
  typeof bulkActionNotificationPoliciesResponseSchema
>;
