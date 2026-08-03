/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_RULE_TAGS,
  ALERT_RULE_UUID,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { ALERT_EPISODE_STATUS, type AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode } from '../queries/episodes_query';
import type { HistogramEpisodeRow } from '../utils/histogram_utils';

export type ClassicAlertSource = Record<string, unknown>;

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'number') {
    return value[0];
  }
  return undefined;
};

const asStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
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
  const uuid = asString(source[ALERT_UUID]) ?? '';
  const start = asString(source[ALERT_START]);
  const timestamp = asString(source[TIMESTAMP]) ?? start ?? new Date().toISOString();
  const end = asString(source[ALERT_END]);
  const lastTimestamp = end ?? timestamp;

  const durationUs = asNumber(source[ALERT_DURATION]);
  const durationMs =
    durationUs != null
      ? Math.round(durationUs / 1000)
      : start
      ? Math.max(0, new Date(lastTimestamp).getTime() - new Date(start).getTime())
      : 0;

  return {
    '@timestamp': timestamp,
    'episode.id': uuid,
    'episode.status': mapClassicStatusToEpisodeStatus(asString(source[ALERT_STATUS])),
    'rule.id': asString(source[ALERT_RULE_UUID]) ?? '',
    group_hash: uuid,
    first_timestamp: start ?? timestamp,
    last_timestamp: lastTimestamp,
    duration: durationMs,
    triggered_at: start,
    last_assignee_uid: null,
    last_tags: asStringArray(source[ALERT_RULE_TAGS]),
    episode_data: null,
    severity: asString(source[ALERT_SEVERITY]) ?? null,
    supports_actions: false,
    supports_timeline: false,
  };
};

/**
 * Maps a v2 episode breakdown field name onto the classic alert value for that
 * dimension, so the histogram can break down v1 rows by the same field. Fields
 * without a v1 equivalent (assignee) resolve to `null`.
 */
const resolveBreakdownValue = (
  source: ClassicAlertSource,
  episode: HistogramEpisodeRow,
  breakdownField: string
): unknown => {
  switch (breakdownField) {
    case 'episode.status':
      return episode['episode.status'];
    case 'rule.id':
      return asString(source[ALERT_RULE_UUID]) ?? null;
    case 'last_ack_action':
      return asString(source[ALERT_WORKFLOW_STATUS]) === 'acknowledged' ? 'ack' : 'unack';
    default:
      // assignee and any other v2-only breakdowns have no v1 equivalent.
      return null;
  }
};

/**
 * Reshapes a classic (v1) alert `_source` document into the lightweight histogram
 * row shape used for client-side overlap counting.
 */
export const mapClassicAlertToHistogramRow = (
  source: ClassicAlertSource,
  breakdownField?: string
): HistogramEpisodeRow => {
  const start = asString(source[ALERT_START]);
  const timestamp = asString(source[TIMESTAMP]) ?? start ?? new Date().toISOString();
  const end = asString(source[ALERT_END]);

  const row: HistogramEpisodeRow = {
    first_timestamp: start ?? timestamp,
    last_timestamp: end ?? timestamp,
    'episode.status': mapClassicStatusToEpisodeStatus(asString(source[ALERT_STATUS])),
  };

  if (breakdownField && breakdownField !== 'episode.status') {
    row[breakdownField] = resolveBreakdownValue(source, row, breakdownField);
  }

  return row;
};
