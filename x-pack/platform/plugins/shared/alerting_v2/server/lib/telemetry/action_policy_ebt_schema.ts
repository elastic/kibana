/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, lazySchema, z } from '@kbn/zod/v4';
import {
  ID_MAX_LENGTH,
  groupingModeSchema,
  throttleStrategySchema,
} from '@kbn/alerting-v2-schemas';
import { ruleChangedEventOriginSchema } from '../event_origin/origin_schemas';

export const ACTION_POLICY_CREATED_EBT_EVENT_TYPE = 'alerting_v2_action_policy_created' as const;
export const ACTION_POLICY_UPDATED_EBT_EVENT_TYPE = 'alerting_v2_action_policy_updated' as const;
export const ACTION_POLICY_DELETED_EBT_EVENT_TYPE = 'alerting_v2_action_policy_deleted' as const;
export const ACTION_POLICY_ENABLED_EBT_EVENT_TYPE = 'alerting_v2_action_policy_enabled' as const;
export const ACTION_POLICY_DISABLED_EBT_EVENT_TYPE = 'alerting_v2_action_policy_disabled' as const;

/** EBT event types registered for an action policy change. The event type is the operation. */
export const ACTION_POLICY_EBT_EVENT_TYPES = [
  ACTION_POLICY_CREATED_EBT_EVENT_TYPE,
  ACTION_POLICY_UPDATED_EBT_EVENT_TYPE,
  ACTION_POLICY_DELETED_EBT_EVENT_TYPE,
  ACTION_POLICY_ENABLED_EBT_EVENT_TYPE,
  ACTION_POLICY_DISABLED_EBT_EVENT_TYPE,
] as const;

export const actionPolicyEbtEventTypeTelemetrySchema = lazySchema(() =>
  z.enum(ACTION_POLICY_EBT_EVENT_TYPES)
);

export type ActionPolicyEbtEventType = z.infer<typeof actionPolicyEbtEventTypeTelemetrySchema>;

/**
 * How a policy selects alerts, without the tags or expression text.
 *
 * - `none`: no matcher, a catch-all policy.
 * - `tags`: routing tags only.
 * - `expression`: a KQL expression only.
 * - `tags_and_expression`: both.
 */
export const ACTION_POLICY_EBT_MATCHER_TYPES = [
  'none',
  'tags',
  'expression',
  'tags_and_expression',
] as const;

export const actionPolicyEbtMatcherTypeTelemetrySchema = lazySchema(() =>
  z.enum(ACTION_POLICY_EBT_MATCHER_TYPES)
);

export type ActionPolicyEbtMatcherType = z.infer<typeof actionPolicyEbtMatcherTypeTelemetrySchema>;

/** Payload shared by every action policy change telemetry event. */
export const actionPolicyChangedTelemetryDataSchema = lazySchema(() =>
  z.object({
    action_policy_id: z
      .string()
      .min(1)
      .max(ID_MAX_LENGTH)
      .describe('The id of the action policy that was changed.'),
    created_at: isoDateTime().describe('ISO timestamp of when the action policy was created.'),
    enabled: z
      .boolean()
      .describe(
        'Whether the action policy was enabled after the operation (for a delete, whether it was enabled when deleted).'
      ),
    destination_count: z
      .number()
      .int()
      .min(0)
      .describe('The number of destinations the action policy notifies.'),
    matcher_type: actionPolicyEbtMatcherTypeTelemetrySchema.describe(
      'How the action policy selects alerts: no matcher, routing tags, a KQL expression, or tags and expression.'
    ),
    grouping_mode: groupingModeSchema.describe(
      'How matched alerts are batched into notifications. `per_alert` when no grouping is set.'
    ),
    throttle_strategy: throttleStrategySchema
      .optional()
      .describe('The throttle strategy, when the action policy has a throttle.'),
    snoozed: z.boolean().describe('Whether the action policy has a snooze set.'),
    origin: ruleChangedEventOriginSchema.describe('Where the change came from.'),
  })
);

export type ActionPolicyChangedEbtData = z.infer<typeof actionPolicyChangedTelemetryDataSchema>;
