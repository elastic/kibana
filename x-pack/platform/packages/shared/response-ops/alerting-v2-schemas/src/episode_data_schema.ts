/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ALERT_EPISODE_STATUS } from './alert_action_schema';

export const EPISODE_ATTACHMENT_TYPE = 'episode' as const;

/**
 * ES|QL `JSON_EXTRACT` may return an object for `episode_data`; normalize to a
 * JSON string so attachment consumers can treat it uniformly.
 */
const episodeDataPayloadSchema = z.preprocess((value) => {
  if (value == null) {
    return value;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}, z.string().nullish());

/**
 * Episode rows from ES|QL use `null` for absent optional fields (not
 * `undefined`), so these must be `.nullish()` rather than `.optional()`.
 */
export const episodeDataSchema = z.object({
  episode_id: z.string().min(1),
  episode_status: z.enum([
    ALERT_EPISODE_STATUS.INACTIVE,
    ALERT_EPISODE_STATUS.PENDING,
    ALERT_EPISODE_STATUS.ACTIVE,
    ALERT_EPISODE_STATUS.RECOVERING,
  ]),
  rule_id: z.string().min(1),
  group_hash: z.string().min(1),
  first_timestamp: z.string().min(1),
  last_timestamp: z.string().min(1),
  duration: z.number(),
  triggered_at: z.string().nullish(),
  severity: z.string().nullish(),
  episode_data: episodeDataPayloadSchema,
  last_ack_action: z.enum(['ack', 'unack']).nullish(),
  last_assignee_uid: z.string().nullish(),
  last_snooze_action: z.enum(['snooze', 'unsnooze']).nullish(),
  snooze_expiry: z.string().nullish(),
  space_id: z.string().min(1),
});

export type EpisodeData = z.infer<typeof episodeDataSchema>;

/** Attachment payload is the same shape as {@link EpisodeData}. */
export type EpisodeAttachmentData = EpisodeData;

export const episodeAttachmentDataSchema = episodeDataSchema;
