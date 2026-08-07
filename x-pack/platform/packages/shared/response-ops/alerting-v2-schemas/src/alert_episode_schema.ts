/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ALERT_EPISODE_STATUS } from './alert_action_schema';
import { tagsSchema } from './common';
import { ID_MAX_LENGTH, MAX_FINGERPRINT_LENGTH } from './constants';

const alertEpisodeStatusSchema = z.enum([
  ALERT_EPISODE_STATUS.ACTIVE,
  ALERT_EPISODE_STATUS.INACTIVE,
  ALERT_EPISODE_STATUS.PENDING,
  ALERT_EPISODE_STATUS.RECOVERING,
]);

/**
 * Canonical AlertEpisode row shape (dotted ES|QL keys).
 * Nullable fields match what query / client normalization may return.
 */
export const alertEpisodeSchema = z
  .object({
    '@timestamp': z.iso.datetime(),
    'episode.id': z.string().min(1).max(ID_MAX_LENGTH),
    'episode.status': alertEpisodeStatusSchema,
    'rule.id': z.string().min(1).max(ID_MAX_LENGTH),
    group_hash: z.string().min(1).max(MAX_FINGERPRINT_LENGTH),
    first_timestamp: z.iso.datetime(),
    last_timestamp: z.iso.datetime(),
    duration: z.number(),
    /** ISO timestamp of the first event where episode.status === 'active'. */
    triggered_at: z.iso.datetime().optional(),
    last_ack_action: z.enum(['ack', 'unack']).optional(),
    last_assignee_uid: z.string().min(1).max(ID_MAX_LENGTH).nullable().optional(),
    last_snooze_action: z.enum(['snooze', 'unsnooze']).optional(),
    snooze_expiry: z.iso.datetime().optional(),
    last_tags: tagsSchema.optional(),
    /** JSON string from the latest non-empty alert `data`. */
    episode_data: z.string().nullable().optional(),
    /** Latest top-level `severity` from a breached rule event, when present. */
    severity: z.string().min(1).nullable().optional(),
  })
  .strict();

export type AlertEpisode = z.infer<typeof alertEpisodeSchema>;
