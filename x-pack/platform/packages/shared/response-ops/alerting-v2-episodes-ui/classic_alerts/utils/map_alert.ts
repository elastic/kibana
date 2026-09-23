/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAME,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
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
import type { AlertEpisode } from '../../queries/episodes_query';
import type { HistogramEpisodeRow } from '../../utils/histogram_utils';

/**
 * Maps legacy v1 severity values that don't exist in the v2 `EpisodeSeverity`
 * enum to the nearest v2 equivalent so they are filterable, sortable, and
 * rendered correctly in the v2 table.
 */
export const V1_SEVERITY_MAP: Record<string, string> = {
  warning: 'medium',
  minor: 'low',
  major: 'high',
};

const normalizeV1Severity = (severity: string | undefined): string | null => {
  if (severity == null) return null;
  const lower = severity.toLowerCase();
  return V1_SEVERITY_MAP[lower] ?? lower;
};

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
  ALERT_RULE_NAME,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_CONSUMER,
  ALERT_SEVERITY,
] as const;

/**
 * Minimum `_source` projection for `mapClassicAlertToHistogramRow`.
 * Includes all possible breakdown fields so a single static list covers every breakdown.
 */
export const CLASSIC_ALERT_HISTOGRAM_SOURCE_FIELDS = [
  TIMESTAMP,
  ALERT_START,
  ALERT_END,
  ALERT_STATUS,
  ALERT_RULE_UUID,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_CONSUMER,
  ALERT_WORKFLOW_STATUS,
] as const;

export interface ClassicAlertSource {
  [TIMESTAMP]: string;
  [ALERT_UUID]: string;
  [ALERT_START]?: string;
  [ALERT_END]?: string;
  [ALERT_DURATION]?: number;
  [ALERT_STATUS]?: string;
  [ALERT_RULE_UUID]?: string;
  [ALERT_RULE_NAME]?: string;
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
 * Reshapes a classic alert `_source` document into the v2 `AlertEpisode` row
 * shape so it can be merged into the v2 alerting (episodes) table. Each classic alert
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
    'rule.name': source[ALERT_RULE_NAME],
    group_hash: uuid,
    first_timestamp: start ?? timestamp,
    last_timestamp: lastTimestamp,
    duration: durationMs,
    triggered_at: start,
    last_assignee_uid: null,
    last_tags: asStringArray(source[ALERT_RULE_TAGS]),
    episode_data: null,
    severity: normalizeV1Severity(source[ALERT_SEVERITY]),
    supports_actions: false,
    supports_timeline: false,
  };
};

/**
 * Maps a v2 episode breakdown field name onto the classic alert value for that
 * dimension, so the histogram can break down v1 rows by the same field. Fields
 * without a v1 equivalent (assignee) resolve to `null`.
 */
const resolveHistogramBreakdownValue = (
  source: ClassicAlertSource,
  episode: HistogramEpisodeRow,
  breakdownField: string
): unknown => {
  switch (breakdownField) {
    case 'episode.status':
      return episode['episode.status'];
    case 'rule.id':
      return source[ALERT_RULE_UUID] ?? null;
    case 'last_ack_action':
      return source[ALERT_WORKFLOW_STATUS] === 'acknowledged' ? 'ack' : 'unack';
    default:
      return null;
  }
};

/**
 * Reshapes a classic alert `_source` document into the lightweight histogram
 * row shape used for client-side overlap counting.
 */
export const mapClassicAlertToHistogramRow = (
  source: ClassicAlertSource,
  breakdownField?: string
): HistogramEpisodeRow => {
  const { [TIMESTAMP]: timestamp } = source;
  const start = source[ALERT_START];
  const end = source[ALERT_END];

  const row: HistogramEpisodeRow = {
    first_timestamp: start ?? timestamp,
    last_timestamp: end ?? timestamp,
    'episode.status': mapClassicStatusToEpisodeStatus(source[ALERT_STATUS]),
  };

  if (breakdownField) {
    row[breakdownField] = resolveHistogramBreakdownValue(source, row, breakdownField);
  }

  return row;
};
