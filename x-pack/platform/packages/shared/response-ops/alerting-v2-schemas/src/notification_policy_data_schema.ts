/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { durationSchema } from './common';

const workflowNotificationPolicyDestinationSchema = z.object({
  type: z.literal('workflow').describe('The destination type.'),
  id: z.string().describe('The workflow connector identifier.'),
});

export const notificationPolicyDestinationSchema = z
  .discriminatedUnion('type', [workflowNotificationPolicyDestinationSchema])
  .describe('A notification destination configuration.');

export const groupingModeSchema = z
  .enum(['per_episode', 'all', 'per_field'])
  .describe(
    'The grouping mode: per_episode groups by episode lifecycle, all sends a single notification for all alerts, per_field groups by the specified fields.'
  );

export type GroupingMode = z.infer<typeof groupingModeSchema>;

export const throttleStrategySchema = z
  .enum(['on_status_change', 'per_status_interval', 'time_interval', 'every_time'])
  .describe('The throttle strategy that controls how often notifications are sent.');

export type ThrottleStrategy = z.infer<typeof throttleStrategySchema>;

const throttleSchema = z.object({
  strategy: throttleStrategySchema.optional().describe('The throttle strategy.'),
  interval: durationSchema.optional().describe('The throttle interval duration (e.g. 5m, 1h).'),
});

const PER_EPISODE_STRATEGIES = new Set<string>([
  'on_status_change',
  'per_status_interval',
  'every_time',
]);
const AGGREGATE_STRATEGIES = new Set<string>(['time_interval', 'every_time']);
const STRATEGIES_REQUIRING_INTERVAL = new Set<string>(['per_status_interval', 'time_interval']);

interface ValidationPayload {
  value: {
    groupingMode?: string | null;
    throttle?: { strategy?: string; interval?: string } | null;
  };
  issues: z.core.$ZodRawIssue[];
}

const validateStrategyInterval = (payload: ValidationPayload) => {
  const { value: data, issues } = payload;
  const strategy = data.throttle?.strategy;
  if (!strategy) return;

  if (STRATEGIES_REQUIRING_INTERVAL.has(strategy) && !data.throttle?.interval) {
    issues.push({
      code: 'custom',
      message: `Strategy "${strategy}" requires an interval to be defined`,
      path: ['throttle', 'interval'],
      input: data,
    });
  }
};

const validateGroupingModeAndStrategy = (payload: ValidationPayload) => {
  const { value: data, issues } = payload;
  const mode = data.groupingMode ?? 'per_episode';
  const strategy = data.throttle?.strategy;
  if (!strategy) return;

  const allowed = mode === 'per_episode' ? PER_EPISODE_STRATEGIES : AGGREGATE_STRATEGIES;
  if (!allowed.has(strategy)) {
    issues.push({
      code: 'custom',
      message: `Strategy "${strategy}" is not valid for grouping mode "${mode}"`,
      path: ['throttle', 'strategy'],
      input: data,
    });
  }

  validateStrategyInterval(payload);
};

export type NotificationPolicyDestination = z.infer<typeof notificationPolicyDestinationSchema>;

export const snoozeNotificationPolicyBodySchema = z.object({
  snoozedUntil: z.iso
    .datetime()
    .describe('The ISO datetime until which the notification policy should be snoozed.'),
});

export type SnoozeNotificationPolicyBody = z.infer<typeof snoozeNotificationPolicyBodySchema>;

const bulkEnableActionSchema = z.object({
  id: z.string().describe('The notification policy identifier.'),
  action: z.literal('enable').describe('The bulk action type.'),
});

const bulkDisableActionSchema = z.object({
  id: z.string().describe('The notification policy identifier.'),
  action: z.literal('disable').describe('The bulk action type.'),
});

const bulkSnoozeActionSchema = z.object({
  id: z.string().describe('The notification policy identifier.'),
  action: z.literal('snooze').describe('The bulk action type.'),
  snoozedUntil: z.iso
    .datetime()
    .describe('The ISO datetime until which the notification policy should be snoozed.'),
});

const bulkUnsnoozeActionSchema = z.object({
  id: z.string().describe('The notification policy identifier.'),
  action: z.literal('unsnooze').describe('The bulk action type.'),
});

const bulkDeleteActionSchema = z.object({
  id: z.string().describe('The notification policy identifier.'),
  action: z.literal('delete').describe('The bulk action type.'),
});

const bulkUpdateApiKeyActionSchema = z.object({
  id: z.string().describe('The notification policy identifier.'),
  action: z.literal('update_api_key').describe('The bulk action type.'),
});

export const notificationPolicyBulkActionSchema = z
  .discriminatedUnion('action', [
    bulkEnableActionSchema,
    bulkDisableActionSchema,
    bulkSnoozeActionSchema,
    bulkUnsnoozeActionSchema,
    bulkDeleteActionSchema,
    bulkUpdateApiKeyActionSchema,
  ])
  .describe('A bulk action to perform on a notification policy.');

export type NotificationPolicyBulkAction = z.infer<typeof notificationPolicyBulkActionSchema>;

export const bulkActionNotificationPoliciesBodySchema = z.object({
  actions: z
    .array(notificationPolicyBulkActionSchema)
    .min(1, 'At least one action is required')
    .describe('The list of bulk actions to perform.'),
});

export type BulkActionNotificationPoliciesBody = z.infer<
  typeof bulkActionNotificationPoliciesBodySchema
>;

export const createNotificationPolicyDataSchema = z
  .object({
    name: z.string().describe('The name of the notification policy.'),
    description: z.string().describe('A description of the notification policy.'),
    destinations: z
      .array(notificationPolicyDestinationSchema)
      .min(1, 'At least one destination must be provided')
      .describe('The list of notification destinations. At least one is required.'),
    matcher: z.string().optional().describe('A KQL query string to match alerts.'),
    groupBy: z.array(z.string()).optional().describe('The fields used to group alerts.'),
    tags: z
      .array(z.string().min(1).max(128))
      .max(20)
      .optional()
      .describe('Tags for categorizing the notification policy.'),
    groupingMode: groupingModeSchema
      .optional()
      .describe('The grouping mode for alert notifications.'),
    throttle: throttleSchema.optional().describe('The throttle configuration for notifications.'),
  })
  .check(validateGroupingModeAndStrategy);

export type CreateNotificationPolicyData = z.infer<typeof createNotificationPolicyDataSchema>;

export const updateNotificationPolicyDataSchema = z
  .object({
    name: z.string().optional().describe('The name of the notification policy.'),
    description: z.string().optional().describe('A description of the notification policy.'),
    destinations: z
      .array(notificationPolicyDestinationSchema)
      .min(1, 'At least one destination must be provided')
      .optional()
      .describe('The list of notification destinations. At least one is required.'),
    matcher: z.string().optional().nullable().describe('A KQL query string to match alerts.'),
    groupBy: z.array(z.string()).optional().nullable().describe('The fields used to group alerts.'),
    tags: z
      .array(z.string().min(1).max(128))
      .max(20)
      .optional()
      .nullable()
      .describe('Tags for categorizing the notification policy.'),
    groupingMode: groupingModeSchema
      .optional()
      .nullable()
      .describe('The grouping mode for alert notifications.'),
    throttle: throttleSchema
      .optional()
      .nullable()
      .describe('The throttle configuration for notifications.'),
  })
  .check((payload) => {
    if (payload.value.throttle === null || payload.value.throttle === undefined) return;
    if (payload.value.groupingMode === undefined) {
      validateStrategyInterval(payload);
      return;
    }
    validateGroupingModeAndStrategy(payload);
  });

export type UpdateNotificationPolicyData = z.infer<typeof updateNotificationPolicyDataSchema>;

export const updateNotificationPolicyBodySchema = updateNotificationPolicyDataSchema.extend({
  version: z
    .string()
    .describe(
      'The current version of the notification policy, used for optimistic concurrency control.'
    ),
});

export type UpdateNotificationPolicyBody = z.infer<typeof updateNotificationPolicyBodySchema>;
