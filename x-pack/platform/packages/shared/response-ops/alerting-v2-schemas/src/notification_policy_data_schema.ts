/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { durationSchema } from './common';

const workflowNotificationPolicyDestinationSchema = z.object({
  type: z.literal('workflow'),
  id: z.string(),
});

export const notificationPolicyDestinationSchema = z.discriminatedUnion('type', [
  workflowNotificationPolicyDestinationSchema,
]);

export type NotificationPolicyDestination = z.infer<typeof notificationPolicyDestinationSchema>;

export const snoozeNotificationPolicyBodySchema = z.object({
  snoozed_until: z.string().datetime(),
});

export type SnoozeNotificationPolicyBody = z.infer<typeof snoozeNotificationPolicyBodySchema>;

const bulkEnableActionSchema = z.object({
  id: z.string(),
  action: z.literal('enable'),
});

const bulkDisableActionSchema = z.object({
  id: z.string(),
  action: z.literal('disable'),
});

const bulkSnoozeActionSchema = z.object({
  id: z.string(),
  action: z.literal('snooze'),
  snoozed_until: z.string().datetime(),
});

export const notificationPolicyBulkActionSchema = z.discriminatedUnion('action', [
  bulkEnableActionSchema,
  bulkDisableActionSchema,
  bulkSnoozeActionSchema,
]);

export type NotificationPolicyBulkAction = z.infer<typeof notificationPolicyBulkActionSchema>;

export const bulkActionNotificationPoliciesBodySchema = z.object({
  actions: z.array(notificationPolicyBulkActionSchema).min(1, 'At least one action is required'),
});

export type BulkActionNotificationPoliciesBody = z.infer<
  typeof bulkActionNotificationPoliciesBodySchema
>;

export const createNotificationPolicyDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  destinations: z
    .array(notificationPolicyDestinationSchema)
    .min(1, 'At least one destination must be provided'),
  matcher: z.string().optional(),
  group_by: z.array(z.string()).optional(),
  throttle: z.object({ interval: durationSchema }).optional(),
  rule_labels: z.array(z.string().max(64)).max(100).optional(),
});

export type CreateNotificationPolicyData = z.infer<typeof createNotificationPolicyDataSchema>;

export const updateNotificationPolicyDataSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  destinations: z
    .array(notificationPolicyDestinationSchema)
    .min(1, 'At least one destination must be provided')
    .optional(),
  matcher: z.string().optional(),
  group_by: z.array(z.string()).optional(),
  throttle: z.object({ interval: durationSchema }).optional(),
  rule_labels: z.array(z.string().max(64)).max(100).optional(),
});

export type UpdateNotificationPolicyData = z.infer<typeof updateNotificationPolicyDataSchema>;

export const updateNotificationPolicyBodySchema = updateNotificationPolicyDataSchema.extend({
  version: z.string(),
});

export type UpdateNotificationPolicyBody = z.infer<typeof updateNotificationPolicyBodySchema>;
