/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ALERT_EPISODE_STATUS } from './alert_action_schema';
import { tagsSchema } from './common';
import { ID_MAX_LENGTH, MAX_EPISODE_DATA_LENGTH, MAX_FINGERPRINT_LENGTH } from './constants';

/** Namespaced to match `ALERTING_NAMESPACE` in `@kbn/alerting-v2-constants`. */
export const EPISODE_ATTACHMENT_TYPE = 'platform.alerting.episode' as const;

const episodeStatusSchema = z.enum([
  ALERT_EPISODE_STATUS.ACTIVE,
  ALERT_EPISODE_STATUS.INACTIVE,
  ALERT_EPISODE_STATUS.PENDING,
  ALERT_EPISODE_STATUS.RECOVERING,
]);

/** Accept nullish and normalize null → undefined so the inferred type matches AlertEpisode optionality. */
const nullishToUndefined = <T extends z.ZodType>(schema: T) =>
  schema.nullish().transform((value) => value ?? undefined);

/**
 * Data stored inside an episode attachment.
 *
 * Mirrors the AlertEpisode row (dotted keys) so the episode details page can
 * hand over the ES|QL row it already has with no flatten/unflatten mapper.
 * The ambient Agent Builder path sends this by value; `resolve` is the
 * by-reference fallback for tools / API callers.
 */
export const episodeAttachmentDataSchema = z
  .object({
    '@timestamp': z.iso.datetime(),
    'episode.id': z.string().min(1).max(ID_MAX_LENGTH),
    'episode.status': episodeStatusSchema,
    'rule.id': z.string().min(1).max(ID_MAX_LENGTH),
    group_hash: z.string().min(1).max(MAX_FINGERPRINT_LENGTH),
    first_timestamp: z.iso.datetime(),
    last_timestamp: z.iso.datetime(),
    duration: z.number(),
    triggered_at: z.iso.datetime().optional(),
    last_ack_action: z.enum(['ack', 'unack']).optional(),
    last_assignee_uid: nullishToUndefined(z.string().min(1).max(ID_MAX_LENGTH)),
    last_snooze_action: z.enum(['snooze', 'unsnooze']).optional(),
    snooze_expiry: z.iso.datetime().optional(),
    last_tags: tagsSchema.optional(),
    episode_data: nullishToUndefined(z.string().max(MAX_EPISODE_DATA_LENGTH)),
    severity: nullishToUndefined(z.string().min(1).max(ID_MAX_LENGTH)),
  })
  .strict();

export type EpisodeAttachmentData = z.infer<typeof episodeAttachmentDataSchema>;
