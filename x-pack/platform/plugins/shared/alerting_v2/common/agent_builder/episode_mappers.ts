/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode, EpisodeAttachmentData } from '@kbn/alerting-v2-schemas';

/** Normalize null → undefined for attachment storage. */
const nullishToUndefined = <T>(value: T | null | undefined): T | undefined => value ?? undefined;

/**
 * Maps an {@link AlertEpisode} row to attachment `data`, normalizing nullables to undefined.
 */
export const alertEpisodeToEpisodeAttachment = (episode: AlertEpisode): EpisodeAttachmentData => ({
  '@timestamp': episode['@timestamp'],
  'episode.id': episode['episode.id'],
  'episode.status': episode['episode.status'],
  'rule.id': episode['rule.id'],
  group_hash: episode.group_hash,
  first_timestamp: episode.first_timestamp,
  last_timestamp: episode.last_timestamp,
  duration: episode.duration,
  triggered_at: episode.triggered_at,
  last_ack_action: episode.last_ack_action,
  last_assignee_uid: nullishToUndefined(episode.last_assignee_uid),
  last_snooze_action: episode.last_snooze_action,
  snooze_expiry: episode.snooze_expiry,
  last_tags: episode.last_tags,
  episode_data: nullishToUndefined(episode.episode_data),
  severity: nullishToUndefined(episode.severity),
});
