/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, isoDateTime } from '@kbn/zod/v4';
import { alertEpisodeStatusSchema } from './alert_episode_schema';
import { groupHashSchema, tagsSchema } from './common';
import { ID_MAX_LENGTH, MAX_EPISODE_DATA_LENGTH, MAX_EPISODE_LABEL_LENGTH } from './constants';

/** Namespaced to match `ALERTING_NAMESPACE` in `@kbn/alerting-v2-constants`. */
export const ALERT_ATTACHMENT_TYPE = 'platform.alerting.alert' as const;

export const alertAttachmentDataSchema = z
  .object({
    '@timestamp': isoDateTime(),
    'alert.id': z.string().min(1).max(ID_MAX_LENGTH),
    'alert.label': z.string().min(1).max(MAX_EPISODE_LABEL_LENGTH).optional(),
    'alert.status': alertEpisodeStatusSchema,
    'rule.id': z.string().min(1).max(ID_MAX_LENGTH),
    group_hash: groupHashSchema,
    first_timestamp: isoDateTime(),
    last_timestamp: isoDateTime(),
    duration: z.number(),
    triggered_at: isoDateTime().optional(),
    last_ack_action: z.enum(['ack', 'unack']).optional(),
    last_assignee_uid: z.string().min(1).max(ID_MAX_LENGTH).optional(),
    last_snooze_action: z.enum(['snooze', 'unsnooze']).optional(),
    snoozed_until: isoDateTime().optional(),
    last_tags: tagsSchema.optional(),
    alert_data: z.string().max(MAX_EPISODE_DATA_LENGTH).optional(),
    severity: z.string().min(1).max(ID_MAX_LENGTH).optional(),
  })
  .strict();

export type AlertAttachmentData = z.infer<typeof alertAttachmentDataSchema>;
