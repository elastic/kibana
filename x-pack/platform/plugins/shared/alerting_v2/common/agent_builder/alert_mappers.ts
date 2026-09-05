/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisode, AlertAttachmentData } from '@kbn/alerting-v2-schemas';
import { resolveAlertLabel } from './resolve_alert_label';

export interface AlertEpisodeToAttachmentOptions {
  ruleName?: string;
  groupingFields?: readonly string[];
}

/** ES|QL returns `null` for missing columns; attachment storage uses `undefined`. */
const mapNullFieldsToUndefined = <T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T]: Exclude<T[K], null> } => {
  const result = {} as { [K in keyof T]: Exclude<T[K], null> };
  for (const key of Object.keys(obj) as Array<keyof T>) {
    const value = obj[key];
    result[key] = (value === null ? undefined : value) as Exclude<T[keyof T], null>;
  }
  return result;
};

/**
 * Maps an {@link AlertEpisode} row to attachment `data`, converting any `null` field to `undefined`.
 * Copies only attachment-schema fields so extra ES|QL columns cannot fail a `.strict()` parse.
 */
export const alertEpisodeToAlertAttachment = (
  episode: AlertEpisode,
  options: AlertEpisodeToAttachmentOptions = {}
): AlertAttachmentData =>
  mapNullFieldsToUndefined({
    '@timestamp': episode['@timestamp'],
    'alert.id': episode['episode.id'],
    'alert.label': resolveAlertLabel({
      episode,
      ruleName: options.ruleName,
      groupingFields: options.groupingFields,
    }),
    'alert.status': episode['episode.status'],
    'rule.id': episode['rule.id'],
    group_hash: episode.group_hash,
    first_timestamp: episode.first_timestamp,
    last_timestamp: episode.last_timestamp,
    duration: episode.duration,
    triggered_at: episode.triggered_at,
    last_ack_action: episode.last_ack_action,
    last_assignee_uid: episode.last_assignee_uid,
    last_snooze_action: episode.last_snooze_action,
    snooze_expiry: episode.snooze_expiry,
    last_tags: episode.last_tags,
    alert_data: episode.episode_data,
    severity: episode.severity,
  });
