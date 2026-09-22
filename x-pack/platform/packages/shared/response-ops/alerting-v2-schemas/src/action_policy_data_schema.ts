/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { durationSchema, tagsSchema } from './common';
import { bulkByIdsSchema } from './bulk_operation_schema';
import {
  ACTION_POLICY_MAX_DESTINATIONS,
  VERSION_MAX_LENGTH,
  ID_MAX_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_GROUPING_FIELDS,
  MAX_KQL_LENGTH,
  MAX_NAME_LENGTH,
} from './constants';

/**
 * The set of supported action policy destination types. Single source of truth
 * for the destination discriminator and any filter that targets destination type.
 */
export const actionPolicyDestinationTypeSchema = z
  .enum(['workflow'])
  .describe('Supported action policy destination types.');

export type ActionPolicyDestinationType = z.infer<typeof actionPolicyDestinationTypeSchema>;

const workflowActionPolicyDestinationSchema = z
  .object({
    type: z
      .literal(actionPolicyDestinationTypeSchema.enum.workflow)
      .describe('The destination type.'),
    id: z.string().min(1).max(ID_MAX_LENGTH).describe('The workflow connector identifier.'),
  })
  .strict();

export const actionPolicyDestinationSchema = z
  .discriminatedUnion('type', [workflowActionPolicyDestinationSchema])
  .describe('An action policy destination configuration.');

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

const throttleSchema = z
  .object({
    strategy: throttleStrategySchema.optional().describe('The throttle strategy.'),
    interval: durationSchema
      .nullish()
      .describe(
        'The throttle interval duration (e.g. 5m, 1h), or null when the strategy is intervalless.'
      ),
  })
  .strict();

export const PER_EPISODE_STRATEGIES = new Set<string>([
  'on_status_change',
  'per_status_interval',
  'every_time',
]);
export const AGGREGATE_STRATEGIES = new Set<string>(['time_interval', 'every_time']);
export const STRATEGIES_REQUIRING_INTERVAL = new Set<string>([
  'per_status_interval',
  'time_interval',
]);

export const needsInterval = (strategy: string | undefined): boolean =>
  strategy != null && STRATEGIES_REQUIRING_INTERVAL.has(strategy);

export interface ValidationPayload {
  value: {
    groupingMode?: string | null;
    throttle?: { strategy?: string; interval?: string | null } | null;
  };
  issues: z.core.$ZodRawIssue[];
}

const validateStrategyInterval = (payload: ValidationPayload) => {
  const { value: data, issues } = payload;
  const strategy = data.throttle?.strategy;
  if (!strategy) return;

  if (needsInterval(strategy) && !data.throttle?.interval) {
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

export type ActionPolicyDestination = z.infer<typeof actionPolicyDestinationSchema>;

export const snoozeActionPolicyBodySchema = z
  .object({
    snoozedUntil: z.iso
      .datetime()
      .describe('The ISO datetime until which the action policy should be snoozed.'),
  })
  .strict();

export type SnoozeActionPolicyBody = z.infer<typeof snoozeActionPolicyBodySchema>;

/**
 * Request body for `POST /action_policies/_bulk_snooze`. Reuses the shared
 * by-ID bulk body (`ids`, 1..MAX_BULK_ITEMS) and adds the snooze expiry so
 * every action policy in the batch is snoozed until the same instant.
 */
export const bulkSnoozeActionPoliciesBodySchema = bulkByIdsSchema
  .extend({
    snoozedUntil: z.iso
      .datetime()
      .describe('The ISO datetime until which the targeted action policies should be snoozed.'),
  })
  .strict();

export type BulkSnoozeActionPoliciesBody = z.infer<typeof bulkSnoozeActionPoliciesBodySchema>;

const createActionPolicyDataBaseSchema = z
  .object({
    name: z.string().min(1).max(MAX_NAME_LENGTH).describe('The name of the action policy.'),
    description: z
      .string()
      .max(MAX_DESCRIPTION_LENGTH)
      .describe('A description of the action policy.'),
    destinations: z
      .array(actionPolicyDestinationSchema)
      .min(1, 'At least one destination must be provided')
      .max(ACTION_POLICY_MAX_DESTINATIONS)
      .describe('The list of destinations. At least one is required.'),
    matcher: z
      .string()
      .max(MAX_KQL_LENGTH)
      .optional()
      .describe('A KQL query string to match alerts.'),
    groupBy: z
      .array(z.string().min(1).max(MAX_FIELD_NAME_LENGTH))
      .max(MAX_GROUPING_FIELDS)
      .optional()
      .describe('The fields used to group alerts.'),
    tags: tagsSchema.optional().describe('Tags for categorizing the action policy.'),
    groupingMode: groupingModeSchema
      .optional()
      .describe('The grouping mode for alert notifications.'),
    throttle: throttleSchema.optional().describe('The throttle configuration for notifications.'),
  })
  .strict();

export const createActionPolicyDataSchema = createActionPolicyDataBaseSchema.check(
  validateGroupingModeAndStrategy
);

export type CreateActionPolicyData = z.infer<typeof createActionPolicyDataSchema>;
export type CreateActionPolicyDataInput = z.input<typeof createActionPolicyDataSchema>;

export const updateActionPolicyDataSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(MAX_NAME_LENGTH)
      .optional()
      .describe('The name of the action policy.'),
    description: z
      .string()
      .max(MAX_DESCRIPTION_LENGTH)
      .optional()
      .describe('A description of the action policy.'),
    destinations: z
      .array(actionPolicyDestinationSchema)
      .min(1, 'At least one destination must be provided')
      .max(ACTION_POLICY_MAX_DESTINATIONS)
      .optional()
      .describe('The list of destinations. At least one is required.'),
    matcher: z
      .string()
      .max(MAX_KQL_LENGTH)
      .optional()
      .nullable()
      .describe('A KQL query string to match alerts.'),
    groupBy: z
      .array(z.string().min(1).max(MAX_FIELD_NAME_LENGTH))
      .max(MAX_GROUPING_FIELDS)
      .optional()
      .nullable()
      .describe('The fields used to group alerts.'),
    tags: tagsSchema.optional().nullable().describe('Tags for categorizing the action policy.'),
    groupingMode: groupingModeSchema
      .optional()
      .nullable()
      .describe('The grouping mode for alert notifications.'),
    throttle: throttleSchema
      .optional()
      .nullable()
      .describe('The throttle configuration for notifications.'),
  })
  .strict()
  .check((payload) => {
    if (payload.value.throttle === null || payload.value.throttle === undefined) return;
    if (payload.value.groupingMode === undefined) {
      validateStrategyInterval(payload);
      return;
    }
    validateGroupingModeAndStrategy(payload);
  });

export type UpdateActionPolicyData = z.infer<typeof updateActionPolicyDataSchema>;

export const updateActionPolicyBodySchema = updateActionPolicyDataSchema.extend({
  version: z
    .string()
    .min(1)
    .max(VERSION_MAX_LENGTH)
    .describe('The current version of the action policy, used for optimistic concurrency control.'),
});

export type UpdateActionPolicyBody = z.infer<typeof updateActionPolicyBodySchema>;

/** Sort field for the find action policies (list) API. */
export const findActionPoliciesSortFieldSchema = z
  .enum(['name', 'createdAt', 'updatedAt'])
  .describe('The available fields to sort action policies by.');
export type FindActionPoliciesSortField = z.infer<typeof findActionPoliciesSortFieldSchema>;

const actionPolicyTagFilterItemSchema = z.string().min(1).max(128);

/** Query parameters for the find action policies (list) API. */
export const findActionPoliciesRequestSchema = z.object({
  page: z.coerce.number().min(1).optional().describe('The page number to return. Defaults to 1.'),
  per_page: z.coerce
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe('The number of action policies to return per page. Defaults to 20.'),
  search: z
    .string()
    .min(1)
    .max(256)
    .optional()
    .describe('A text string to search across action policy fields.'),
  tags: z
    .union([actionPolicyTagFilterItemSchema, z.array(actionPolicyTagFilterItemSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]).map((t) => t.trim()).filter(Boolean))
    .pipe(z.array(actionPolicyTagFilterItemSchema).max(10))
    .optional()
    .describe('Filter by tags. Accepts a single string or an array.'),
  enabled: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .describe('Filter by enabled status. Accepts the strings true or false.'),
  sort_field: findActionPoliciesSortFieldSchema
    .optional()
    .describe('The field to sort action policies by.'),
  sort_order: z.enum(['asc', 'desc']).optional().describe('The sort direction.'),
});

export type FindActionPoliciesRequest = z.infer<typeof findActionPoliciesRequestSchema>;
