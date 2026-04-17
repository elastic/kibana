/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

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
  episode_id: z.string().describe('The episode identifier for the alert to acknowledge.'),
});

const unackActionSchema = z.object({
  action_type: z
    .literal(ALERT_EPISODE_ACTION_TYPE.UNACK)
    .describe('Removes acknowledgement from an alert.'),
  episode_id: z.string().describe('The episode identifier for the alert to unacknowledge.'),
});

const tagActionSchema = z.object({
  action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.TAG).describe('Adds tags to an alert.'),
  tags: z.array(z.string()).describe('List of tags to add to the alert.'),
});

const snoozeActionSchema = z.object({
  action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.SNOOZE).describe('Snoozes an alert.'),
  expiry: z.string().optional().describe('ISO datetime when snooze should expire.'),
});

const unsnoozeActionSchema = z.object({
  action_type: z
    .literal(ALERT_EPISODE_ACTION_TYPE.UNSNOOZE)
    .describe('Removes snooze from an alert.'),
});

const activateActionSchema = z.object({
  action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.ACTIVATE).describe('Activates an alert.'),
  reason: z.string().describe('Reason for activating the alert.'),
});

const deactivateActionSchema = z.object({
  action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.DEACTIVATE).describe('Deactivates an alert.'),
  reason: z.string().describe('Reason for deactivating the alert.'),
});

export const createAckAlertActionBodySchema = ackActionSchema.omit({ action_type: true }).strict();
export type CreateAckAlertActionBody = z.infer<typeof createAckAlertActionBodySchema>;

export const createUnackAlertActionBodySchema = unackActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateUnackAlertActionBody = z.infer<typeof createUnackAlertActionBodySchema>;

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
    tagActionSchema,
    snoozeActionSchema,
    unsnoozeActionSchema,
    activateActionSchema,
    deactivateActionSchema,
  ])
  .describe(
    'Request body for creating a single alert action. One of: ack, unack, tag, snooze, unsnooze, activate, deactivate.'
  );

export type CreateAlertActionBody = z.infer<typeof createAlertActionBodySchema>;

export const createAlertActionParamsSchema = z
  .object({
    group_hash: z.string().describe('Hash identifying the alert group to apply the action to.'),
  })
  .describe('Path parameters for the create alert action endpoint.');

export type CreateAlertActionParams = z.infer<typeof createAlertActionParamsSchema>;

export const bulkCreateAlertActionItemBodySchema = createAlertActionBodySchema.and(
  z
    .object({
      group_hash: z.string().describe('Hash identifying the alert group to apply the action to.'),
    })
    .describe('Alert action payload with group identifier for bulk requests.')
);
export type BulkCreateAlertActionItemBody = z.infer<typeof bulkCreateAlertActionItemBodySchema>;

export const bulkCreateAlertActionBodySchema = z
  .array(bulkCreateAlertActionItemBodySchema)
  .min(1, 'At least one action must be provided')
  .max(100, 'Cannot process more than 100 actions in a single request')
  .describe(
    'Request body for bulk create alert actions. Array of 1 to 100 actions, each with group_hash and action payload.'
  );
export type BulkCreateAlertActionBody = z.infer<typeof bulkCreateAlertActionBodySchema>;
