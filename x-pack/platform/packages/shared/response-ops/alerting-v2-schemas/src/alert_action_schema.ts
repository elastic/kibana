/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { tagsSchema } from './common';
import {
  ID_MAX_LENGTH,
  MAX_BULK_ITEMS,
  MAX_FIELD_NAME_LENGTH,
  MAX_SNOOZE_CONDITIONS,
} from './constants';

/** Severity levels an alert episode can carry. Kept in sync with the alerting_v2 alert-events schema. */
export const SNOOZE_SEVERITY_LEVELS = ['info', 'low', 'medium', 'high', 'critical'] as const;

/**
 * A condition that lifts an episode snooze when it is met. Mirrors Alerting V1's per-alert snooze
 * conditions: the snooze auto-lifts when a tracked field changes from its value at snooze time
 * (`field_change`/`severity_change`) or when severity reaches a given level (`severity_equals`).
 */
export const snoozeConditionSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('field_change'),
      field: z
        .string()
        .min(1)
        .max(MAX_FIELD_NAME_LENGTH)
        .describe('Dot-notation path of the episode data field to watch for changes.'),
    })
    .describe('Lifts the snooze when the watched field changes from its value at snooze time.'),
  z
    .object({ type: z.literal('severity_change') })
    .describe('Lifts the snooze when the episode severity changes from its value at snooze time.'),
  z
    .object({
      type: z.literal('severity_equals'),
      value: z.enum(SNOOZE_SEVERITY_LEVELS).describe('Severity level that lifts the snooze.'),
    })
    .describe('Lifts the snooze when the episode severity equals the given level.'),
]);
export type SnoozeCondition = z.infer<typeof snoozeConditionSchema>;

/** How multiple snooze conditions combine: `any` (default) lifts on the first met, `all` requires every one. */
export const snoozeConditionOperatorSchema = z.enum(['any', 'all']);
export type SnoozeConditionOperator = z.infer<typeof snoozeConditionOperatorSchema>;

export enum ALERT_EPISODE_STATUS {
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ACTIVE = 'active',
  RECOVERING = 'recovering',
}

export type AlertEpisodeStatus = (typeof ALERT_EPISODE_STATUS)[keyof typeof ALERT_EPISODE_STATUS];

export enum ALERT_EPISODE_ACTION_TYPE {
  ACK = 'ack',
  UNACK = 'unack',
  ASSIGN = 'assign',
  TAG = 'tag',
  SNOOZE = 'snooze',
  UNSNOOZE = 'unsnooze',
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
}

export type AlertEpisodeActionType =
  (typeof ALERT_EPISODE_ACTION_TYPE)[keyof typeof ALERT_EPISODE_ACTION_TYPE];

const ackActionSchema = z.object({
  action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.ACK).describe('Acknowledges an alert.'),
  episode_id: z
    .string()
    .min(1)
    .max(ID_MAX_LENGTH)
    .describe('The episode identifier for the alert to acknowledge.'),
});

const unackActionSchema = z.object({
  action_type: z
    .literal(ALERT_EPISODE_ACTION_TYPE.UNACK)
    .describe('Removes acknowledgement from an alert.'),
  episode_id: z
    .string()
    .min(1)
    .max(ID_MAX_LENGTH)
    .describe('The episode identifier for the alert to unacknowledge.'),
});

const assignActionSchema = z.object({
  action_type: z
    .literal(ALERT_EPISODE_ACTION_TYPE.ASSIGN)
    .describe('Assigns an alerting episode to a user, or clears the assignee when null.'),
  episode_id: z.string().min(1).max(ID_MAX_LENGTH).describe('The episode identifier to assign.'),
  assignee_uid: z
    .string()
    .max(256)
    .nullable()
    .describe('User profile UID of the assignee, or null to remove the assignee from the episode.'),
});

const tagActionSchema = z.object({
  action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.TAG).describe('Adds tags to an alert.'),
  tags: tagsSchema.describe('List of tags to add to the alert.'),
});

const snoozeActionSchema = z.object({
  action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.SNOOZE).describe('Snoozes an alert.'),
  expiry: z.iso.datetime().optional().describe('ISO datetime when snooze should expire.'),
  conditions: z
    .array(snoozeConditionSchema)
    .max(MAX_SNOOZE_CONDITIONS)
    .optional()
    .describe('Optional conditions that automatically lift the snooze when met.'),
  condition_operator: snoozeConditionOperatorSchema
    .optional()
    .describe('How to combine `conditions` when deciding to lift the snooze. Defaults to `any`.'),
});

const unsnoozeActionSchema = z.object({
  action_type: z
    .literal(ALERT_EPISODE_ACTION_TYPE.UNSNOOZE)
    .describe('Removes snooze from an alert.'),
});

const activateActionSchema = z.object({
  action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.ACTIVATE).describe('Activates an alert.'),
  reason: z.string().min(1).max(1024).describe('Reason for activating the alert.'),
});

const deactivateActionSchema = z.object({
  action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.DEACTIVATE).describe('Deactivates an alert.'),
  reason: z.string().min(1).max(1024).describe('Reason for deactivating the alert.'),
});

export const createAckAlertActionBodySchema = ackActionSchema.omit({ action_type: true }).strict();
export type CreateAckAlertActionBody = z.infer<typeof createAckAlertActionBodySchema>;

export const createUnackAlertActionBodySchema = unackActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateUnackAlertActionBody = z.infer<typeof createUnackAlertActionBodySchema>;

export const createAssignAlertActionBodySchema = assignActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateAssignAlertActionBody = z.infer<typeof createAssignAlertActionBodySchema>;

export const createTagAlertActionBodySchema = tagActionSchema.omit({ action_type: true }).strict();
export type CreateTagAlertActionBody = z.infer<typeof createTagAlertActionBodySchema>;

export const createSnoozeAlertActionBodySchema = snoozeActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateSnoozeAlertActionBody = z.infer<typeof createSnoozeAlertActionBodySchema>;

export const createUnsnoozeAlertActionBodySchema = unsnoozeActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateUnsnoozeAlertActionBody = z.infer<typeof createUnsnoozeAlertActionBodySchema>;

export const createActivateAlertActionBodySchema = activateActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateActivateAlertActionBody = z.infer<typeof createActivateAlertActionBodySchema>;

export const createDeactivateAlertActionBodySchema = deactivateActionSchema
  .omit({
    action_type: true,
  })
  .strict();
export type CreateDeactivateAlertActionBody = z.infer<typeof createDeactivateAlertActionBodySchema>;

export const createAlertActionBodySchema = z
  .discriminatedUnion('action_type', [
    ackActionSchema,
    unackActionSchema,
    assignActionSchema,
    tagActionSchema,
    snoozeActionSchema,
    unsnoozeActionSchema,
    activateActionSchema,
    deactivateActionSchema,
  ])
  .describe(
    'Request body for creating a single alert action. One of: ack, unack, assign, tag, snooze, unsnooze, activate, deactivate.'
  );

export type CreateAlertActionBody = z.infer<typeof createAlertActionBodySchema>;

export const createAlertActionParamsSchema = z
  .object({
    group_hash: z
      .string()
      .min(1)
      .max(256)
      .describe('Hash identifying the alert group to apply the action to.'),
  })
  .describe('Path parameters for the create alert action endpoint.');

export type CreateAlertActionParams = z.infer<typeof createAlertActionParamsSchema>;

export const bulkCreateAlertActionItemBodySchema = createAlertActionBodySchema.and(
  z
    .object({
      group_hash: z
        .string()
        .min(1)
        .max(256)
        .describe('Hash identifying the alert group to apply the action to.'),
    })
    .describe('Alert action payload with group identifier for bulk requests.')
);
export type BulkCreateAlertActionItemBody = z.infer<typeof bulkCreateAlertActionItemBodySchema>;

export const bulkCreateAlertActionBodySchema = z
  .array(bulkCreateAlertActionItemBodySchema)
  .min(1, 'At least one action must be provided')
  .max(MAX_BULK_ITEMS, `Cannot process more than ${MAX_BULK_ITEMS} actions in a single request`)
  .describe(
    `Request body for bulk create alert actions. Array of 1 to ${MAX_BULK_ITEMS} actions, each with group_hash and action payload.`
  );
export type BulkCreateAlertActionBody = z.infer<typeof bulkCreateAlertActionBodySchema>;
