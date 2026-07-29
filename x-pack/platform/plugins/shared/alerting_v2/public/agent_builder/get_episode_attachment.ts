/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  EPISODE_ATTACHMENT_TYPE,
  type EpisodeAttachmentData,
} from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';

const normalizeEpisodeData = (
  value: AlertEpisode['episode_data'] | Record<string, unknown> | undefined
): string | undefined => {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
};

/** Drop ES|QL `null`s so JSON payloads omit the key (Zod `.optional()` rejects null). */
const omitNull = <T>(value: T | null | undefined): T | undefined =>
  value == null ? undefined : value;

export const getEpisodeAttachmentData = (
  episode: AlertEpisode,
  spaceId: string
): EpisodeAttachmentData => ({
  episode_id: episode['episode.id'],
  episode_status: episode['episode.status'],
  rule_id: episode['rule.id'],
  group_hash: episode.group_hash,
  first_timestamp: episode.first_timestamp,
  last_timestamp: episode.last_timestamp,
  duration: episode.duration,
  triggered_at: omitNull(episode.triggered_at),
  severity: omitNull(episode.severity),
  // ES|QL JSON_EXTRACT may return an object; coerce to a JSON string for the schema.
  episode_data: normalizeEpisodeData(episode.episode_data),
  last_ack_action: omitNull(episode.last_ack_action),
  last_assignee_uid: omitNull(episode.last_assignee_uid),
  last_snooze_action: omitNull(episode.last_snooze_action),
  snooze_expiry: omitNull(episode.snooze_expiry),
  space_id: spaceId,
});

export const getEpisodeAttachment = (
  episode: AlertEpisode,
  spaceId: string
): AttachmentInput<typeof EPISODE_ATTACHMENT_TYPE, EpisodeAttachmentData> => ({
  id: `${EPISODE_ATTACHMENT_TYPE}:${episode['episode.id']}`,
  type: EPISODE_ATTACHMENT_TYPE,
  origin: episode['episode.id'],
  data: getEpisodeAttachmentData(episode, spaceId),
});
