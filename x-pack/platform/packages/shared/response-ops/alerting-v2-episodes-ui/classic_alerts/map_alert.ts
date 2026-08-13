/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';

/**
 * Minimum `_source` projection for `mapClassicAlertToEpisode`.
 * Passing this to the RAC find request avoids transferring the full document.
 */
export const CLASSIC_ALERT_EPISODE_SOURCE_FIELDS = [
  TIMESTAMP,
  ALERT_UUID,
  ALERT_START,
  ALERT_END,
  ALERT_DURATION,
  ALERT_STATUS,
  ALERT_RULE_UUID,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_CONSUMER,
  ALERT_SEVERITY,
] as const;

import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../queries/episodes_query';

export interface ClassicAlertSource {
  [TIMESTAMP]: string;
  [ALERT_UUID]: string;
  [ALERT_START]?: string;
  [ALERT_END]?: string;
  [ALERT_DURATION]?: number;
  [ALERT_STATUS]?: string;
  [ALERT_RULE_UUID]?: string;
  [ALERT_RULE_TAGS]?: string | string[];
  [ALERT_SEVERITY]?: string;
  [ALERT_WORKFLOW_STATUS]?: string;
}

const asStringArray = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
};

/**
 * Maps the classic `kibana.alert.status` values onto the v2 episode status enum
 * so the shared status cell renderer can display them. Only `active` maps to the
 * active episode status; `recovered` / `untracked` (and anything else) map to
 * `inactive`.
 */
export const mapClassicStatusToEpisodeStatus = (status: string | undefined): AlertEpisodeStatus =>
  status === ALERT_STATUS_ACTIVE ? ALERT_EPISODE_STATUS.ACTIVE : ALERT_EPISODE_STATUS.INACTIVE;

/**
 * Reshapes a classic (v1) alert `_source` document into the v2 `AlertEpisode` row
 * shape so it can be merged into the v2 alerting (episodes) table. Each v1 alert
 * maps to one episode. v2-only fields (ack / assignee / snooze / episode data) are
 * emitted as `null`. Capability flags are set to `false`.
 */
export const mapClassicAlertToEpisode = (source: ClassicAlertSource): AlertEpisode => {
  const { [TIMESTAMP]: timestamp, [ALERT_UUID]: uuid } = source;
  const start = source[ALERT_START];
  const end = source[ALERT_END];
  const lastTimestamp = end ?? timestamp;

  const durationUs = source[ALERT_DURATION];
  const durationMs =
    durationUs != null
      ? Math.round(durationUs / 1000)
      : start
      ? Math.max(0, new Date(lastTimestamp).getTime() - new Date(start).getTime())
      : 0;

  return {
    '@timestamp': timestamp,
    'episode.id': uuid,
    'episode.status': mapClassicStatusToEpisodeStatus(source[ALERT_STATUS]),
    'rule.id': source[ALERT_RULE_UUID] ?? '',
    group_hash: uuid,
    first_timestamp: start ?? timestamp,
    last_timestamp: lastTimestamp,
    duration: durationMs,
    triggered_at: start,
    last_assignee_uid: null,
    last_tags: asStringArray(source[ALERT_RULE_TAGS]),
    episode_data: null,
    severity: source[ALERT_SEVERITY] ?? null,
    supports_actions: false,
    supports_timeline: false,
  };
};
