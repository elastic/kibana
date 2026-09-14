/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { alertEpisodeStatusSchema } from './alert_episode_schema';
import { tagsSchema } from './common';
import {
  ID_MAX_LENGTH,
  MAX_EPISODE_DATA_LENGTH,
  MAX_EPISODE_LABEL_LENGTH,
  MAX_FINGERPRINT_LENGTH,
} from './constants';

/** Namespaced to match `ALERTING_NAMESPACE` in `@kbn/alerting-v2-constants`. */
export const EPISODE_ATTACHMENT_TYPE = 'platform.alerting.episode' as const;

export const episodeAttachmentDataSchema = z
  .object({
    '@timestamp': z.iso.datetime(),
    'episode.id': z.string().min(1).max(ID_MAX_LENGTH),
    'episode.label': z.string().min(1).max(MAX_EPISODE_LABEL_LENGTH).optional(),
    'episode.status': alertEpisodeStatusSchema,
    'rule.id': z.string().min(1).max(ID_MAX_LENGTH),
    group_hash: z.string().min(1).max(MAX_FINGERPRINT_LENGTH),
    first_timestamp: z.iso.datetime(),
    last_timestamp: z.iso.datetime(),
    duration: z.number(),
    triggered_at: z.iso.datetime().optional(),
    last_ack_action: z.enum(['ack', 'unack']).optional(),
    last_assignee_uid: z.string().min(1).max(ID_MAX_LENGTH).optional(),
    last_snooze_action: z.enum(['snooze', 'unsnooze']).optional(),
    snooze_expiry: z.iso.datetime().optional(),
    last_tags: tagsSchema.optional(),
    episode_data: z.string().max(MAX_EPISODE_DATA_LENGTH).optional(),
    severity: z.string().min(1).max(ID_MAX_LENGTH).optional(),
  })
  .strict();

export type EpisodeAttachmentData = z.infer<typeof episodeAttachmentDataSchema>;
