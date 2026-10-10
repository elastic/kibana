/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { durationSchema, queryIntSchema } from './common';
import { bulkByIdsSchema } from './bulk_operation_schema';
import {
  ACTION_POLICY_MAX_DESTINATIONS,
  FIND_DEFAULT_PER_PAGE,
  FIND_MAX_RESULT_WINDOW,
  ID_MAX_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_GROUPING_FIELDS,
  MAX_KQL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PER_PAGE,
} from './constants';
import {
  POLICY_MATCHER_DESCRIPTION,
  POLICY_MATCHER_PATCH_DESCRIPTION,
  policyMatcherPatchSchema,
  policyMatcherSchema,
} from './policy_matcher_schema';

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
    id: z.string().min(1).max(ID_MAX_LENGTH).describe('The workflow identifier.'),
  })
  .strict()
  .meta({ id: 'alerting_workflow_action_policy_destination' });

export const actionPolicyDestinationSchema = z
  .discriminatedUnion('type', [workflowActionPolicyDestinationSchema])
  .describe('An action policy destination configuration.')
  .meta({ id: 'alerting_action_policy_destination' });

const GROUPING_MODE_COPY = {
  per_alert: 'one notification per alert lifecycle (default).',
  all: 'a single notification for all matching alerts.',
  per_field: 'group by the specified `fields`.',
} as const;

export const groupingModeSchema = z
  .union([
    z.literal('per_alert').describe(GROUPING_MODE_COPY.per_alert),
    z.literal('all').describe(GROUPING_MODE_COPY.all),
    z.literal('per_field').describe(GROUPING_MODE_COPY.per_field),
  ])
  .describe(
    'The grouping mode: per_alert groups by alert lifecycle, all sends a single notification for all alerts, per_field groups by the specified fields.'
  )
  .meta({ id: 'alerting_action_policy_grouping_mode' });

export type GroupingMode = z.infer<typeof groupingModeSchema>;

const GROUPING_FIELDS_DESCRIPTION =
  'The fields alerts are grouped by. At least one is required, and no other mode accepts them.';

const groupingFieldsSchema = z
  .array(z.string().max(MAX_FIELD_NAME_LENGTH).trim().min(1))
  .min(1)
  .max(MAX_GROUPING_FIELDS)
  .describe(GROUPING_FIELDS_DESCRIPTION);

const fieldlessGroupingSchema = <M extends Exclude<GroupingMode, 'per_field'>>(mode: M) =>
  z
    .object({ mode: z.literal(mode) })
    .strict()
    .describe(GROUPING_MODE_COPY[mode])
    .meta({ id: `alerting_action_policy_grouping_${mode}` });

/**
 * The mode decides which keys the grouping has, so each one is its own variant: `per_field` groups
 * by `fields` and is the only mode that reads them, which is why they are required there and are
 * not a key the others accept. Replaced whole on PATCH, like every union.
 */
export const actionPolicyGroupingSchema = z
  .discriminatedUnion('mode', [
    fieldlessGroupingSchema('per_alert'),
    fieldlessGroupingSchema('all'),
    z
      .object({ mode: z.literal('per_field'), fields: groupingFieldsSchema })
      .strict()
      .describe(GROUPING_MODE_COPY.per_field)
      .meta({ id: 'alerting_action_policy_grouping_per_field' }),
  ])
  .meta({ id: 'alerting_action_policy_grouping' });

export type ActionPolicyGrouping = z.infer<typeof actionPolicyGroupingSchema>;

const THROTTLE_STRATEGY_COPY = {
  on_status_change: 'notify only on alert status transitions (default for `per_alert`).',
  per_status_interval: 'notify on transitions and at regular intervals.',
  time_interval:
    'notify at regular intervals regardless of status (default for `all`/`per_field`).',
  every_time: 'notify on every evaluation cycle (high volume).',
} as const;

export const throttleStrategySchema = z
  .union([
    z.literal('on_status_change').describe(THROTTLE_STRATEGY_COPY.on_status_change),
    z.literal('per_status_interval').describe(THROTTLE_STRATEGY_COPY.per_status_interval),
    z.literal('time_interval').describe(THROTTLE_STRATEGY_COPY.time_interval),
    z.literal('every_time').describe(THROTTLE_STRATEGY_COPY.every_time),
  ])
  .describe('The throttle strategy that controls how often notifications are sent.');

export type ThrottleStrategy = z.infer<typeof throttleStrategySchema>;

/** The strategies that notify on a schedule, and so carry the `interval` that sets it. */
export const INTERVAL_THROTTLE_STRATEGIES = ['per_status_interval', 'time_interval'] as const;
export type IntervalThrottleStrategy = (typeof INTERVAL_THROTTLE_STRATEGIES)[number];

export const PER_ALERT_STRATEGIES = new Set<string>([
  'on_status_change',
  'per_status_interval',
  'every_time',
]);
export const AGGREGATE_STRATEGIES = new Set<string>(['time_interval', 'every_time']);
export const STRATEGIES_REQUIRING_INTERVAL: ReadonlySet<string> = new Set(
  INTERVAL_THROTTLE_STRATEGIES
);

/** Narrows to the strategies whose throttle variant carries an `interval`. */
export const needsInterval = (strategy: string | undefined): strategy is IntervalThrottleStrategy =>
  strategy != null && STRATEGIES_REQUIRING_INTERVAL.has(strategy);

const THROTTLE_INTERVAL_DESCRIPTION =
  'The throttle interval duration (e.g. 5m, 1h) that sets the notification cadence.';

const intervalThrottleSchema = <S extends IntervalThrottleStrategy>(strategy: S) =>
  z
    .object({
      strategy: z.literal(strategy),
      interval: durationSchema.describe(THROTTLE_INTERVAL_DESCRIPTION),
    })
    .strict()
    .describe(THROTTLE_STRATEGY_COPY[strategy])
    .meta({ id: `alerting_action_policy_throttle_${strategy}` });

const intervallessThrottleSchema = <S extends Exclude<ThrottleStrategy, IntervalThrottleStrategy>>(
  strategy: S
) =>
  z
    .object({ strategy: z.literal(strategy) })
    .strict()
    .describe(THROTTLE_STRATEGY_COPY[strategy])
    .meta({ id: `alerting_action_policy_throttle_${strategy}` });

/**
 * The strategy decides which keys the throttle has, so each one is its own variant: an `interval`
 * is required by the scheduled strategies and is not a key the others accept. Replaced whole on
 * PATCH, like every union — a partial variant could never validate.
 */
export const throttleSchema = z
  .discriminatedUnion('strategy', [
    intervallessThrottleSchema('on_status_change'),
    intervalThrottleSchema('per_status_interval'),
    intervalThrottleSchema('time_interval'),
    intervallessThrottleSchema('every_time'),
  ])
  .meta({ id: 'alerting_action_policy_throttle' });

export type Throttle = z.infer<typeof throttleSchema>;

export interface ValidationPayload {
  value: {
    grouping?: { mode: string } | null;
    throttle?: { strategy: string } | null;
  };
  issues: z.core.$ZodRawIssue[];
}

const validateGroupingModeAndStrategy = ({ value: data, issues }: ValidationPayload) => {
  if (data.throttle == null) return;

  const mode = data.grouping?.mode ?? 'per_alert';
  const { strategy } = data.throttle;
  const allowed = mode === 'per_alert' ? PER_ALERT_STRATEGIES : AGGREGATE_STRATEGIES;

  if (!allowed.has(strategy)) {
    issues.push({
      code: 'custom',
      message: `Strategy "${strategy}" is not valid for grouping mode "${mode}"`,
      path: ['throttle', 'strategy'],
      input: data,
    });
  }
};

export type ActionPolicyDestination = z.infer<typeof actionPolicyDestinationSchema>;

export const snoozeActionPolicyBodySchema = z
  .object({
    snoozed_until: z.iso
      .datetime()
      .describe('The ISO datetime until which the action policy should be snoozed.'),
  })
  .strict()
  .meta({ id: 'alerting_snooze_action_policy_request' });

export type SnoozeActionPolicyBody = z.infer<typeof snoozeActionPolicyBodySchema>;

/**
 * Request body for `POST /action_policies/_bulk_snooze`. Reuses the shared
 * by-ID bulk body (`ids`, 1..MAX_BULK_ITEMS) and adds the snooze expiry so
 * every action policy in the batch is snoozed until the same instant.
 */
export const bulkSnoozeActionPoliciesBodySchema = bulkByIdsSchema
  .extend({
    snoozed_until: z.iso
      .datetime()
      .describe('The ISO datetime until which the targeted action policies should be snoozed.'),
  })
  .strict()
  .meta({ id: 'alerting_bulk_snooze_action_policies_request' });

export type BulkSnoozeActionPoliciesBody = z.infer<typeof bulkSnoozeActionPoliciesBodySchema>;

const actionPolicyNameSchema = z
  .string()
  .max(MAX_NAME_LENGTH)
  .trim()
  .min(1)
  .describe('The name of the action policy.');

const ACTION_POLICY_DESCRIPTION_DESCRIPTION =
  'A description of the action policy. Absent when the policy has none; send `null` on PATCH to clear it.';

const GROUPING_DESCRIPTION =
  'How matched alerts are batched into notifications. Absent falls back to `per_alert`; send `null` on PATCH to clear it. The mode decides the rest of the block, so a PATCH replaces it whole: send the complete mode variant rather than a single field.';

const THROTTLE_DESCRIPTION =
  'The throttle configuration for notifications. Absent when notifications are not throttled; send `null` on PATCH to clear it. The strategy decides the rest of the block, so a PATCH replaces it whole: send the complete strategy variant rather than a single field.';

const actionPolicyDescriptionSchema = z
  .string()
  .max(MAX_DESCRIPTION_LENGTH)
  .trim()
  .min(1)
  .describe(ACTION_POLICY_DESCRIPTION_DESCRIPTION);

const createActionPolicyDataBaseSchema = z
  .object({
    name: actionPolicyNameSchema,
    description: actionPolicyDescriptionSchema.optional(),
    destinations: z
      .array(actionPolicyDestinationSchema)
      .min(1, 'At least one destination must be provided')
      .max(ACTION_POLICY_MAX_DESTINATIONS)
      .describe('The list of destinations. At least one is required.'),
    matcher: policyMatcherSchema.optional().describe(POLICY_MATCHER_DESCRIPTION),
    grouping: actionPolicyGroupingSchema.optional().describe(GROUPING_DESCRIPTION),
    throttle: throttleSchema.optional().describe(THROTTLE_DESCRIPTION),
  })
  .strict();

export const createActionPolicyDataSchema = createActionPolicyDataBaseSchema
  .check(validateGroupingModeAndStrategy)
  .meta({ id: 'alerting_new_action_policy' });

export type CreateActionPolicyData = z.infer<typeof createActionPolicyDataSchema>;
export type CreateActionPolicyDataInput = z.input<typeof createActionPolicyDataSchema>;

/**
 * Request body schema for `PUT /api/alerting/v2/action_policies/{id}`: the create-action-policy
 * data, unchanged. Lifecycle state is not part of any write body — a replace creates the policy
 * enabled and otherwise preserves the stored value, and `_enable`/`_disable` own the transition.
 */
export const putActionPolicyDataSchema = createActionPolicyDataBaseSchema
  .check(validateGroupingModeAndStrategy)
  .meta({ id: 'alerting_put_action_policy' });

export type PutActionPolicyData = z.infer<typeof putActionPolicyDataSchema>;
export type PutActionPolicyDataInput = z.input<typeof putActionPolicyDataSchema>;

/**
 * Request body schema for `PATCH /api/alerting/v2/action_policies/{id}`: the create schema with
 * every field optional, nested objects replaced by their patch counterparts so leaves merge
 * independently, and `null` accepted wherever the create schema allows a field to be absent.
 *
 * Cross-field checks are deliberately absent — a sparse delta cannot satisfy them. The merged
 * document is validated against {@link createActionPolicyDataSchema} instead.
 */
export const updateActionPolicyDataSchema = z
  .object({
    name: actionPolicyNameSchema.optional(),
    description: actionPolicyDescriptionSchema.nullable().optional(),
    destinations: z
      .array(actionPolicyDestinationSchema)
      .min(1, 'At least one destination must be provided')
      .max(ACTION_POLICY_MAX_DESTINATIONS)
      .optional()
      .describe('The list of destinations. At least one is required.'),
    matcher: policyMatcherPatchSchema
      .nullable()
      .optional()
      .describe(POLICY_MATCHER_PATCH_DESCRIPTION),
    grouping: actionPolicyGroupingSchema.nullable().optional().describe(GROUPING_DESCRIPTION),
    throttle: throttleSchema.nullable().optional().describe(THROTTLE_DESCRIPTION),
  })
  .strict()
  .meta({ id: 'alerting_update_action_policy' });

export type UpdateActionPolicyData = z.infer<typeof updateActionPolicyDataSchema>;

/** Sort field for the find action policies (list) API. */
export const findActionPoliciesSortFieldSchema = z
  .enum(['name', 'created_at', 'updated_at'])
  .describe('The available fields to sort action policies by.');
export type FindActionPoliciesSortField = z.infer<typeof findActionPoliciesSortFieldSchema>;

/** Query parameters for the find action policies (list) API. */
export const findActionPoliciesRequestSchema = z
  .object({
    page: queryIntSchema({ min: 1, max: FIND_MAX_RESULT_WINDOW })
      .optional()
      .describe('The page number to return. Defaults to 1.'),
    per_page: queryIntSchema({ min: 1, max: MAX_PER_PAGE })
      .optional()
      .describe('The number of action policies to return per page. Defaults to 20.'),
    filter: z
      .string()
      .max(MAX_KQL_LENGTH)
      .optional()
      .describe(
        'A KQL filter to apply to the action policies. Supported fields: id, name, description, enabled.'
      ),
    search: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe('A text string to search across action policy fields.'),
    sort_field: findActionPoliciesSortFieldSchema
      .optional()
      .describe('The field to sort action policies by.'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('The sort direction.'),
  })
  .strict()
  .refine(
    ({ page = 1, per_page = FIND_DEFAULT_PER_PAGE }) => page * per_page <= FIND_MAX_RESULT_WINDOW,
    { message: `page * per_page cannot exceed ${FIND_MAX_RESULT_WINDOW}.`, path: ['page'] }
  );

export type FindActionPoliciesRequest = z.infer<typeof findActionPoliciesRequestSchema>;
