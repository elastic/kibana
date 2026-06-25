/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type {
  AlertEpisodeStatus,
  AlertEventSeverity,
  AlertEventStatus,
} from '../../../resources/datastreams/alert_events';

export function getAlertEventESQLResponse(overrides?: {
  '@timestamp'?: string;
  group_hash?: string;
  episode_id?: string;
  episode_status?: AlertEpisodeStatus | null;
  rule_id?: string;
  rule_version?: number;
  space_id?: string;
  data_json?: string | null;
  severity?: AlertEventSeverity | null;
}): EsqlQueryResponse {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'episode_id', type: 'keyword' },
      { name: 'episode_status', type: 'keyword' },
      { name: 'rule_id', type: 'keyword' },
      { name: 'rule_version', type: 'long' },
      { name: 'space_id', type: 'keyword' },
      { name: 'data_json', type: 'keyword' },
      { name: 'severity', type: 'keyword' },
    ],
    values: [
      [
        overrides?.['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
        overrides?.group_hash ?? 'test-group-hash',
        overrides?.episode_id ?? 'episode-1',
        overrides?.episode_status === undefined ? 'active' : overrides.episode_status,
        overrides?.rule_id ?? 'test-rule-id',
        overrides?.rule_version ?? 1,
        overrides?.space_id ?? 'default',
        overrides?.data_json === undefined ? null : overrides.data_json,
        overrides?.severity === undefined ? null : overrides.severity,
      ],
    ],
  };
}

export function getEmptyESQLResponse(): EsqlQueryResponse {
  return {
    columns: [],
    values: [],
  };
}

/**
 * Mocks the batched pre-deactivate ES|QL response. Each input record
 * becomes one row keyed by `episode_id` (which is what
 * `AlertActionsClient.findPreDeactivateAlertEvents` returns its map by).
 * Pass a single-element array for the single-route activate path.
 */
export function getPreDeactivateAlertEventESQLResponse(
  records: Array<{
    '@timestamp'?: string;
    group_hash?: string;
    episode_id?: string;
    episode_status?: 'active' | 'recovering';
    episode_status_count?: number | null;
    rule_id?: string;
    rule_version?: number;
    space_id?: string;
    status?: AlertEventStatus;
    data_json?: string | null;
    severity?: AlertEventSeverity | null;
  }> = [{}]
): EsqlQueryResponse {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'episode_id', type: 'keyword' },
      { name: 'episode_status', type: 'keyword' },
      { name: 'episode_status_count', type: 'long' },
      { name: 'rule_id', type: 'keyword' },
      { name: 'rule_version', type: 'long' },
      { name: 'space_id', type: 'keyword' },
      { name: 'status', type: 'keyword' },
      { name: 'data_json', type: 'keyword' },
      { name: 'severity', type: 'keyword' },
    ],
    values: records.map(
      (record) =>
        [
          record['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
          record.group_hash ?? 'test-group-hash',
          record.episode_id ?? 'episode-1',
          record.episode_status ?? 'active',
          record.episode_status_count === undefined ? null : record.episode_status_count,
          record.rule_id ?? 'test-rule-id',
          record.rule_version ?? 1,
          record.space_id ?? 'default',
          record.status ?? 'breached',
          record.data_json === undefined ? null : record.data_json,
          record.severity === undefined ? null : record.severity,
        ] as FieldValue[]
    ),
  };
}

/**
 * Mocks the batched lifecycle ES|QL response (one row per episode). Each
 * record yields `{ episode_id, last_action_type }`, matching the shape
 * `AlertActionsClient.findLastEpisodeLifecycleActionTypes` consumes.
 *
 * For the "no lifecycle action for this episode" case the caller can either
 * pass an empty array or simply omit the episode from the records list —
 * absence in the response maps to absence in the returned Map.
 */
export function getLastEpisodeLifecycleActionsESQLResponse(
  records: Array<{ episode_id?: string; last_action_type?: string }> = []
): EsqlQueryResponse {
  return {
    columns: [
      { name: 'episode_id', type: 'keyword' },
      { name: 'last_action_type', type: 'keyword' },
    ],
    values: records.map(
      (record) =>
        [record.episode_id ?? 'episode-1', record.last_action_type ?? 'deactivate'] as FieldValue[]
    ),
  };
}

export function getBulkGetAlertActionsESQLResponse(
  records: Array<{
    episode_id?: string;
    rule_id?: string;
    group_hash?: string;
    last_ack_action?: string | null;
    last_deactivate_action?: string | null;
    last_snooze_action?: string | null;
    tags?: string[] | null;
  }>
): EsqlQueryResponse {
  return {
    columns: [
      { name: 'episode_id', type: 'keyword' },
      { name: 'rule_id', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'last_ack_action', type: 'keyword' },
      { name: 'last_deactivate_action', type: 'keyword' },
      { name: 'last_snooze_action', type: 'keyword' },
      { name: 'tags', type: 'keyword' },
    ],
    values: records.map(
      (record) =>
        [
          record.episode_id ?? 'episode-1',
          record.rule_id ?? 'test-rule-id',
          record.group_hash ?? 'test-group-hash',
          record.last_ack_action ?? null,
          record.last_deactivate_action ?? null,
          record.last_snooze_action ?? null,
          record.tags ?? null,
        ] as FieldValue[]
    ),
  };
}

export function getBulkAlertEventsESQLResponse(
  records: Array<{
    '@timestamp'?: string;
    group_hash?: string;
    episode_id?: string;
    episode_status?: AlertEpisodeStatus | null;
    episode_status_count?: number | null;
    rule_id?: string;
    rule_version?: number;
    space_id?: string;
    status?: AlertEventStatus;
    data_json?: string | null;
    severity?: AlertEventSeverity | null;
  }>
): EsqlQueryResponse {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'episode_id', type: 'keyword' },
      { name: 'episode_status', type: 'keyword' },
      { name: 'episode_status_count', type: 'long' },
      { name: 'rule_id', type: 'keyword' },
      { name: 'rule_version', type: 'long' },
      { name: 'space_id', type: 'keyword' },
      { name: 'status', type: 'keyword' },
      { name: 'data_json', type: 'keyword' },
      { name: 'severity', type: 'keyword' },
    ],
    values: records.map(
      (record) =>
        [
          record['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
          record.group_hash ?? 'test-group-hash',
          record.episode_id ?? 'episode-1',
          record.episode_status === undefined ? 'active' : record.episode_status,
          record.episode_status_count === undefined ? null : record.episode_status_count,
          record.rule_id ?? 'test-rule-id',
          record.rule_version ?? 1,
          record.space_id ?? 'default',
          record.status ?? 'breached',
          record.data_json === undefined ? null : record.data_json,
          record.severity === undefined ? null : record.severity,
        ] as FieldValue[]
    ),
  };
}
