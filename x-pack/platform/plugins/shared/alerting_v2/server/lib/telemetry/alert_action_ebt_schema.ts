/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { MAX_BULK_ITEMS, ruleIdSchema } from '@kbn/alerting-v2-schemas';
import { eventOriginSchema } from '../event_origin/origin_schemas';

export const ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE =
  'alerting_v2_alert_ack_action_applied' as const;
export const ALERT_UNACK_ACTION_APPLIED_EBT_EVENT_TYPE =
  'alerting_v2_alert_unack_action_applied' as const;
export const ALERT_ASSIGN_ACTION_APPLIED_EBT_EVENT_TYPE =
  'alerting_v2_alert_assign_action_applied' as const;
export const ALERT_TAG_ACTION_APPLIED_EBT_EVENT_TYPE =
  'alerting_v2_alert_tag_action_applied' as const;
export const ALERT_ACTIVATE_ACTION_APPLIED_EBT_EVENT_TYPE =
  'alerting_v2_alert_activate_action_applied' as const;
export const ALERT_DEACTIVATE_ACTION_APPLIED_EBT_EVENT_TYPE =
  'alerting_v2_alert_deactivate_action_applied' as const;
export const ALERT_SNOOZE_ACTION_APPLIED_EBT_EVENT_TYPE =
  'alerting_v2_alert_snooze_action_applied' as const;
export const ALERT_UNSNOOZE_ACTION_APPLIED_EBT_EVENT_TYPE =
  'alerting_v2_alert_unsnooze_action_applied' as const;

/** EBT event types registered for an applied alert action. The event type is the action. */
export const ALERT_ACTION_EBT_EVENT_TYPES = [
  ALERT_ACK_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_UNACK_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_ASSIGN_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_TAG_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_ACTIVATE_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_DEACTIVATE_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_SNOOZE_ACTION_APPLIED_EBT_EVENT_TYPE,
  ALERT_UNSNOOZE_ACTION_APPLIED_EBT_EVENT_TYPE,
] as const;

export const alertActionEbtEventTypeTelemetrySchema = lazySchema(() =>
  z.enum(ALERT_ACTION_EBT_EVENT_TYPES)
);

export type AlertActionEbtEventType = z.infer<typeof alertActionEbtEventTypeTelemetrySchema>;

/**
 * Kibana space ids are lowercase letters, digits, underscores, and hyphens.
 * Spaces does not cap the id; the space name is capped at 1024, and this
 * field uses that cap.
 */
const SPACE_ID_MAX_LENGTH = 1024;
const SPACE_ID_PATTERN = /^[a-z0-9_-]+$/;

/**
 * Test contract for the shared payload. Core registers the `EventTypeOpts`
 * schema in `alert_action_ebt_event.ts` and does not parse this zod schema
 * before `reportEvent`, matching rule-change EBT.
 */
export const alertActionAppliedTelemetryDataSchema = lazySchema(() =>
  z.object({
    space_id: z
      .string()
      .min(1)
      .max(SPACE_ID_MAX_LENGTH)
      .regex(SPACE_ID_PATTERN, 'Must be a lowercase Kibana space id.')
      .describe('The space the action occurred in.'),
    rule_id: ruleIdSchema
      .optional()
      .describe(
        'The id of the rule that produced the alert. Absent when the alert has no rule id.'
      ),
    origin: eventOriginSchema.describe('Where the action came from.'),
    alert_count: z
      .number()
      .int()
      .min(1)
      .max(MAX_BULK_ITEMS)
      .describe(
        'Number of successfully applied alerts for this action, space, and rule. A bulk call that spans rules reports one event per rule.'
      ),
  })
);

export type AlertActionAppliedEbtData = z.infer<typeof alertActionAppliedTelemetryDataSchema>;
