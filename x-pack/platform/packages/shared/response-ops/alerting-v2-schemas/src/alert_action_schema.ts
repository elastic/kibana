/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { tagsSchema } from './common';
import { ID_MAX_LENGTH, MAX_BULK_ITEMS } from './constants';

export const ALERT_EPISODE_STATUS = {
  INACTIVE: 'inactive',
  PENDING: 'pending',
  ACTIVE: 'active',
  RECOVERING: 'recovering',
} as const;

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

const ackActionSchema = z
  .object({
    action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.ACK).describe('Acknowledges an alert.'),
    episode_id: z
      .string()
      .min(1)
      .max(ID_MAX_LENGTH)
      .describe('The episode identifier for the alert to acknowledge.'),
  })
  .strict()
  .meta({ id: 'alerting_ack_alert_action' });

const unackActionSchema = z
  .object({
    action_type: z
      .literal(ALERT_EPISODE_ACTION_TYPE.UNACK)
      .describe('Removes acknowledgement from an alert.'),
    episode_id: z
      .string()
      .min(1)
      .max(ID_MAX_LENGTH)
      .describe('The episode identifier for the alert to unacknowledge.'),
  })
  .strict()
  .meta({ id: 'alerting_unack_alert_action' });

const assignActionSchema = z
  .object({
    action_type: z
      .literal(ALERT_EPISODE_ACTION_TYPE.ASSIGN)
      .describe('Assigns an alerting episode to a user, or clears the assignee when null.'),
    episode_id: z.string().min(1).max(ID_MAX_LENGTH).describe('The episode identifier to assign.'),
    assignee_uid: z
      .string()
      .max(256)
      .nullable()
      .describe(
        'User profile UID of the assignee, or null to remove the assignee from the episode.'
      ),
  })
  .strict()
  .meta({ id: 'alerting_assign_alert_action' });

const tagActionSchema = z
  .object({
    action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.TAG).describe('Adds tags to an alert.'),
    tags: tagsSchema.describe('List of tags to add to the alert.'),
  })
  .strict()
  .meta({ id: 'alerting_tag_alert_action' });

const snoozeActionSchema = z
  .object({
    action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.SNOOZE).describe('Snoozes an alert.'),
    expiry: z.iso.datetime().optional().describe('ISO datetime when snooze should expire.'),
  })
  .strict()
  .meta({ id: 'alerting_snooze_alert_action' });

const unsnoozeActionSchema = z
  .object({
    action_type: z
      .literal(ALERT_EPISODE_ACTION_TYPE.UNSNOOZE)
      .describe('Removes snooze from an alert.'),
  })
  .strict()
  .meta({ id: 'alerting_unsnooze_alert_action' });

const activateActionSchema = z
  .object({
    action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.ACTIVATE).describe('Activates an alert.'),
    reason: z.string().min(1).max(1024).describe('Reason for activating the alert.'),
  })
  .strict()
  .meta({ id: 'alerting_activate_alert_action' });

const deactivateActionSchema = z
  .object({
    action_type: z.literal(ALERT_EPISODE_ACTION_TYPE.DEACTIVATE).describe('Deactivates an alert.'),
    reason: z.string().min(1).max(1024).describe('Reason for deactivating the alert.'),
  })
  .strict()
  .meta({ id: 'alerting_deactivate_alert_action' });

export const createAckAlertActionBodySchema = ackActionSchema
  .omit({ action_type: true })
  .strict()
  .meta({ id: 'alerting_new_ack_alert_action' });
export type CreateAckAlertActionBody = z.infer<typeof createAckAlertActionBodySchema>;

export const createUnackAlertActionBodySchema = unackActionSchema
  .omit({ action_type: true })
  .strict()
  .meta({ id: 'alerting_new_unack_alert_action' });
export type CreateUnackAlertActionBody = z.infer<typeof createUnackAlertActionBodySchema>;

export const createAssignAlertActionBodySchema = assignActionSchema
  .omit({ action_type: true })
  .strict()
  .meta({ id: 'alerting_new_assign_alert_action' });
export type CreateAssignAlertActionBody = z.infer<typeof createAssignAlertActionBodySchema>;

export const createTagAlertActionBodySchema = tagActionSchema
  .omit({ action_type: true })
  .strict()
  .meta({ id: 'alerting_new_tag_alert_action' });
export type CreateTagAlertActionBody = z.infer<typeof createTagAlertActionBodySchema>;

export const createSnoozeAlertActionBodySchema = snoozeActionSchema
  .omit({ action_type: true })
  .strict()
  .meta({ id: 'alerting_new_snooze_alert_action' });
export type CreateSnoozeAlertActionBody = z.infer<typeof createSnoozeAlertActionBodySchema>;

export const createUnsnoozeAlertActionBodySchema = unsnoozeActionSchema
  .omit({ action_type: true })
  .strict()
  .meta({ id: 'alerting_new_unsnooze_alert_action' });
export type CreateUnsnoozeAlertActionBody = z.infer<typeof createUnsnoozeAlertActionBodySchema>;

export const createActivateAlertActionBodySchema = activateActionSchema
  .omit({ action_type: true })
  .strict()
  .meta({ id: 'alerting_new_activate_alert_action' });
export type CreateActivateAlertActionBody = z.infer<typeof createActivateAlertActionBodySchema>;

export const createDeactivateAlertActionBodySchema = deactivateActionSchema
  .omit({
    action_type: true,
  })
  .strict()
  .meta({ id: 'alerting_new_deactivate_alert_action' });
export type CreateDeactivateAlertActionBody = z.infer<typeof createDeactivateAlertActionBodySchema>;

/**
 * Action types that target an alert series as a whole, identified by `group_hash`.
 */
export const SERIES_ALERT_ACTION_TYPES = [
  ALERT_EPISODE_ACTION_TYPE.TAG,
  ALERT_EPISODE_ACTION_TYPE.SNOOZE,
  ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
] as const;
export type SeriesAlertActionType = (typeof SERIES_ALERT_ACTION_TYPES)[number];

/**
 * Action types that target one specific episode, identified by `episode_id`.
 */
export const EPISODE_ALERT_ACTION_TYPES = [
  ALERT_EPISODE_ACTION_TYPE.ACK,
  ALERT_EPISODE_ACTION_TYPE.UNACK,
  ALERT_EPISODE_ACTION_TYPE.ASSIGN,
  ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
  ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
] as const;
export type EpisodeAlertActionType = (typeof EPISODE_ALERT_ACTION_TYPES)[number];

// Episode-scoped variants of ack/unack/assign: the target episode is addressed
// by the request path (or the bulk item key), so the body carries no episode_id.
const ackEpisodeActionSchema = z
  .object({
    action_type: z
      .literal(ALERT_EPISODE_ACTION_TYPE.ACK)
      .describe('Acknowledges an alerting episode.'),
  })
  .strict();

const unackEpisodeActionSchema = z
  .object({
    action_type: z
      .literal(ALERT_EPISODE_ACTION_TYPE.UNACK)
      .describe('Removes acknowledgement from an alerting episode.'),
  })
  .strict();

const assignEpisodeActionSchema = z
  .object({
    action_type: z
      .literal(ALERT_EPISODE_ACTION_TYPE.ASSIGN)
      .describe('Assigns an alerting episode to a user, or clears the assignee when null.'),
    assignee_uid: z
      .string()
      .max(256)
      .nullable()
      .describe(
        'User profile UID of the assignee, or null to remove the assignee from the episode.'
      ),
  })
  .strict();

export const createSeriesAlertActionBodySchema = z
  .discriminatedUnion('action_type', [tagActionSchema, snoozeActionSchema, unsnoozeActionSchema])
  .describe(
    'Request body for creating a series-level alert action. One of: tag, snooze, unsnooze.'
  );
export type CreateSeriesAlertActionBody = z.infer<typeof createSeriesAlertActionBodySchema>;

export const createEpisodeAlertActionBodySchema = z
  .discriminatedUnion('action_type', [
    ackEpisodeActionSchema,
    unackEpisodeActionSchema,
    assignEpisodeActionSchema,
    activateActionSchema,
    deactivateActionSchema,
  ])
  .describe(
    'Request body for creating an episode-level alert action. One of: ack, unack, assign, activate, deactivate.'
  );
export type CreateEpisodeAlertActionBody = z.infer<typeof createEpisodeAlertActionBodySchema>;

export const seriesAlertActionParamsSchema = z
  .object({
    group_hash: z
      .string()
      .min(1)
      .max(256)
      .describe('Hash identifying the alert series to apply the action to.'),
  })
  .describe('Path parameters for series-level alert action endpoints.');
export type SeriesAlertActionParams = z.infer<typeof seriesAlertActionParamsSchema>;

export const episodeAlertActionParamsSchema = z
  .object({
    episode_id: z
      .string()
      .min(1)
      .max(ID_MAX_LENGTH)
      .describe('Identifier of the episode to apply the action to.'),
  })
  .describe('Path parameters for episode-level alert action endpoints.');
export type EpisodeAlertActionParams = z.infer<typeof episodeAlertActionParamsSchema>;

// Route body schemas for the series-level endpoints (action_type comes from the path).
export const createTagSeriesActionBodySchema = tagActionSchema.omit({ action_type: true }).strict();
export type CreateTagSeriesActionBody = z.infer<typeof createTagSeriesActionBodySchema>;

export const createSnoozeSeriesActionBodySchema = snoozeActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateSnoozeSeriesActionBody = z.infer<typeof createSnoozeSeriesActionBodySchema>;

export const createUnsnoozeSeriesActionBodySchema = unsnoozeActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateUnsnoozeSeriesActionBody = z.infer<typeof createUnsnoozeSeriesActionBodySchema>;

// Route body schemas for the episode-level endpoints (action_type comes from the
// path, episode_id from the path parameter). Ack/unack bodies are empty objects.
export const createAckEpisodeActionBodySchema = ackEpisodeActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateAckEpisodeActionBody = z.infer<typeof createAckEpisodeActionBodySchema>;

export const createUnackEpisodeActionBodySchema = unackEpisodeActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateUnackEpisodeActionBody = z.infer<typeof createUnackEpisodeActionBodySchema>;

export const createAssignEpisodeActionBodySchema = assignEpisodeActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateAssignEpisodeActionBody = z.infer<typeof createAssignEpisodeActionBodySchema>;

export const createActivateEpisodeActionBodySchema = activateActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateActivateEpisodeActionBody = z.infer<typeof createActivateEpisodeActionBodySchema>;

export const createDeactivateEpisodeActionBodySchema = deactivateActionSchema
  .omit({ action_type: true })
  .strict();
export type CreateDeactivateEpisodeActionBody = z.infer<
  typeof createDeactivateEpisodeActionBodySchema
>;

export const bulkCreateSeriesAlertActionItemBodySchema = createSeriesAlertActionBodySchema.and(
  z
    .object({
      group_hash: z
        .string()
        .min(1)
        .max(256)
        .describe('Hash identifying the alert series to apply the action to.'),
    })
    .strict()
    .describe('Series-level alert action payload with series identifier for bulk requests.')
);
export type BulkCreateSeriesAlertActionItemBody = z.infer<
  typeof bulkCreateSeriesAlertActionItemBodySchema
>;

export const bulkCreateSeriesAlertActionBodySchema = z
  .array(bulkCreateSeriesAlertActionItemBodySchema)
  .min(1, 'At least one action must be provided')
  .max(MAX_BULK_ITEMS, `Cannot process more than ${MAX_BULK_ITEMS} actions in a single request`)
  .describe(
    `Request body for bulk create series-level alert actions. Array of 1 to ${MAX_BULK_ITEMS} actions, each with group_hash and action payload.`
  );
export type BulkCreateSeriesAlertActionBody = z.infer<typeof bulkCreateSeriesAlertActionBodySchema>;

export const bulkCreateEpisodeAlertActionItemBodySchema = createEpisodeAlertActionBodySchema.and(
  z
    .object({
      episode_id: z
        .string()
        .min(1)
        .max(ID_MAX_LENGTH)
        .describe('Identifier of the episode to apply the action to.'),
    })
    .strict()
    .describe('Episode-level alert action payload with episode identifier for bulk requests.')
);
export type BulkCreateEpisodeAlertActionItemBody = z.infer<
  typeof bulkCreateEpisodeAlertActionItemBodySchema
>;

export const bulkCreateEpisodeAlertActionBodySchema = z
  .array(bulkCreateEpisodeAlertActionItemBodySchema)
  .min(1, 'At least one action must be provided')
  .max(MAX_BULK_ITEMS, `Cannot process more than ${MAX_BULK_ITEMS} actions in a single request`)
  .describe(
    `Request body for bulk create episode-level alert actions. Array of 1 to ${MAX_BULK_ITEMS} actions, each with episode_id and action payload.`
  );
export type BulkCreateEpisodeAlertActionBody = z.infer<
  typeof bulkCreateEpisodeAlertActionBodySchema
>;

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
  )
  .meta({ id: 'alerting_alert_action' });

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

export const bulkCreateAlertActionItemBodySchema = createAlertActionBodySchema
  .and(
    z
      .object({
        group_hash: z
          .string()
          .min(1)
          .max(256)
          .describe('Hash identifying the alert group to apply the action to.'),
      })
      .strict()
      .describe('Alert action payload with group identifier for bulk requests.')
  )
  .meta({ id: 'alerting_bulk_create_alert_action_item' });
export type BulkCreateAlertActionItemBody = z.infer<typeof bulkCreateAlertActionItemBodySchema>;

export const bulkCreateAlertActionBodySchema = z
  .array(bulkCreateAlertActionItemBodySchema)
  .min(1, 'At least one action must be provided')
  .max(MAX_BULK_ITEMS, `Cannot process more than ${MAX_BULK_ITEMS} actions in a single request`)
  .describe(
    `Request body for bulk create alert actions. Array of 1 to ${MAX_BULK_ITEMS} actions, each with group_hash and action payload.`
  )
  .meta({ id: 'alerting_bulk_create_alert_actions_request' });
export type BulkCreateAlertActionBody = z.infer<typeof bulkCreateAlertActionBodySchema>;
