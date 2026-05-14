/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { durationSchema, tagsSchema } from './common';
import {
  ID_MAX_LENGTH,
  MAX_BULK_ITEMS,
  MAX_DESCRIPTION_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_GROUPING_FIELDS,
  MAX_KQL_LENGTH,
  MAX_NAME_LENGTH,
} from './constants';

/** Maximum number of destinations per action policy. */
const MAX_DESTINATIONS = 10;

/**
 * The set of supported action policy destination types. Single source of truth
 * for the destination discriminator and any filter that targets destination type.
 */
export const actionPolicyDestinationTypeSchema = z
  .enum(['workflow'])
  .describe('Supported action policy destination types.');

export type ActionPolicyDestinationType = z.infer<typeof actionPolicyDestinationTypeSchema>;

const workflowActionPolicyDestinationSchema = z.object({
  type: z
    .literal(actionPolicyDestinationTypeSchema.enum.workflow)
    .describe('The destination type.'),
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The workflow connector identifier.'),
});

export const actionPolicyDestinationSchema = z
  .discriminatedUnion('type', [workflowActionPolicyDestinationSchema])
  .describe('An action policy destination configuration.');

export const groupingModeSchema = z
  .enum(['per_episode', 'all', 'per_field'])
  .describe(
    'The grouping mode: per_episode groups by episode lifecycle, all sends a single notification for all alerts, per_field groups by the specified fields.'
  );

export type GroupingMode = z.infer<typeof groupingModeSchema>;

export const actionPolicyTypeSchema = z
  .enum(['global', 'single_rule'])
  .describe(
    'The action policy type. "global" matches alerts from any rule in the space (default). "single_rule" matches alerts only from the linked rule (requires ruleId).'
  );

export type ActionPolicyType = z.infer<typeof actionPolicyTypeSchema>;

export const throttleStrategySchema = z
  .enum(['on_status_change', 'per_status_interval', 'time_interval', 'every_time'])
  .describe('The throttle strategy that controls how often notifications are sent.');

export type ThrottleStrategy = z.infer<typeof throttleStrategySchema>;

const throttleSchema = z.object({
  strategy: throttleStrategySchema.optional().describe('The throttle strategy.'),
  interval: durationSchema
    .nullish()
    .describe(
      'The throttle interval duration (e.g. 5m, 1h), or null when the strategy is intervalless.'
    ),
});

const PER_EPISODE_STRATEGIES = new Set<string>([
  'on_status_change',
  'per_status_interval',
  'every_time',
]);
const AGGREGATE_STRATEGIES = new Set<string>(['time_interval', 'every_time']);
const STRATEGIES_REQUIRING_INTERVAL = new Set<string>(['per_status_interval', 'time_interval']);

export const needsInterval = (strategy: string | undefined): boolean =>
  strategy != null && STRATEGIES_REQUIRING_INTERVAL.has(strategy);

interface ValidationPayload {
  value: {
    groupingMode?: string | null;
    throttle?: { strategy?: string; interval?: string | null } | null;
    type?: string;
    ruleId?: string;
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

const validateTypeAndRuleId = (payload: ValidationPayload) => {
  const { value: data, issues } = payload;

  if (data.type === 'single_rule') {
    if (!data.ruleId) {
      issues.push({
        code: 'custom',
        message: 'ruleId is required when type is "single_rule"',
        path: ['ruleId'],
        input: data,
      });
    }
    return;
  }

  if (data.ruleId !== undefined) {
    issues.push({
      code: 'custom',
      message: 'ruleId is only allowed when type is "single_rule"',
      path: ['ruleId'],
      input: data,
    });
  }
};

export type ActionPolicyDestination = z.infer<typeof actionPolicyDestinationSchema>;

export const snoozeActionPolicyBodySchema = z.object({
  snoozedUntil: z.iso
    .datetime()
    .describe('The ISO datetime until which the action policy should be snoozed.'),
});

export type SnoozeActionPolicyBody = z.infer<typeof snoozeActionPolicyBodySchema>;

const bulkEnableActionSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The action policy identifier.'),
  action: z.literal('enable').describe('The bulk action type.'),
});

const bulkDisableActionSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The action policy identifier.'),
  action: z.literal('disable').describe('The bulk action type.'),
});

const bulkSnoozeActionSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The action policy identifier.'),
  action: z.literal('snooze').describe('The bulk action type.'),
  snoozedUntil: z.iso
    .datetime()
    .describe('The ISO datetime until which the action policy should be snoozed.'),
});

const bulkUnsnoozeActionSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The action policy identifier.'),
  action: z.literal('unsnooze').describe('The bulk action type.'),
});

const bulkDeleteActionSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The action policy identifier.'),
  action: z.literal('delete').describe('The bulk action type.'),
});

const bulkUpdateApiKeyActionSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The action policy identifier.'),
  action: z.literal('update_api_key').describe('The bulk action type.'),
});

export const actionPolicyBulkActionSchema = z
  .discriminatedUnion('action', [
    bulkEnableActionSchema,
    bulkDisableActionSchema,
    bulkSnoozeActionSchema,
    bulkUnsnoozeActionSchema,
    bulkDeleteActionSchema,
    bulkUpdateApiKeyActionSchema,
  ])
  .describe('A bulk action to perform on an action policy.');

export type ActionPolicyBulkAction = z.infer<typeof actionPolicyBulkActionSchema>;

export const bulkActionActionPoliciesBodySchema = z.object({
  actions: z
    .array(actionPolicyBulkActionSchema)
    .min(1, 'At least one action is required')
    .max(MAX_BULK_ITEMS)
    .describe('The list of bulk actions to perform.'),
});

export type BulkActionActionPoliciesBody = z.infer<typeof bulkActionActionPoliciesBodySchema>;

export const createActionPolicyDataSchema = z
  .object({
    name: z.string().min(1).max(MAX_NAME_LENGTH).describe('The name of the action policy.'),
    description: z
      .string()
      .max(MAX_DESCRIPTION_LENGTH)
      .describe('A description of the action policy.'),
    type: actionPolicyTypeSchema
      .default('global')
      .describe('The action policy type. Defaults to "global" when omitted.'),
    ruleId: z
      .string()
      .min(1)
      .optional()
      .describe('The rule this policy is attached to. Required when type is "single_rule".'),
    destinations: z
      .array(actionPolicyDestinationSchema)
      .min(1, 'At least one destination must be provided')
      .max(MAX_DESTINATIONS)
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
  .check(validateGroupingModeAndStrategy, validateTypeAndRuleId);

export type CreateActionPolicyData = z.infer<typeof createActionPolicyDataSchema>;
// Caller-facing shape: `type` is optional because the schema defaults it to 'global'.
export type CreateActionPolicyDataInput = z.input<typeof createActionPolicyDataSchema>;

// Note: `type` and `ruleId` are immutable after creation. The schema is
// strict so attempts to send them through update return 400 instead of
// silently stripping the fields. To change either, delete and recreate the
// policy.
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
      .max(MAX_DESTINATIONS)
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
    .max(256)
    .describe('The current version of the action policy, used for optimistic concurrency control.'),
});

export type UpdateActionPolicyBody = z.infer<typeof updateActionPolicyBodySchema>;
