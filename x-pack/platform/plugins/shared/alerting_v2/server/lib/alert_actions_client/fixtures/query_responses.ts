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

export function getPreDeactivateAlertEventESQLResponse(overrides?: {
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
}): EsqlQueryResponse {
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
    values: [
      [
        overrides?.['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
        overrides?.group_hash ?? 'test-group-hash',
        overrides?.episode_id ?? 'episode-1',
        overrides?.episode_status ?? 'active',
        overrides?.episode_status_count === undefined ? null : overrides.episode_status_count,
        overrides?.rule_id ?? 'test-rule-id',
        overrides?.rule_version ?? 1,
        overrides?.space_id ?? 'default',
        overrides?.status ?? 'breached',
        overrides?.data_json === undefined ? null : overrides.data_json,
        overrides?.severity === undefined ? null : overrides.severity,
      ],
    ],
  };
}

export function getLastEpisodeActionESQLResponse(overrides?: {
  action_type: string;
}): EsqlQueryResponse {
  return {
    columns: [{ name: 'action_type', type: 'keyword' }],
    values: [[overrides?.action_type ?? 'deactivate']],
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
    rule_id?: string;
    space_id?: string;
  }>
): EsqlQueryResponse {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'rule_id', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'episode_id', type: 'keyword' },
      { name: 'space_id', type: 'keyword' },
    ],
    values: records.map((record) => [
      record['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
      record.rule_id ?? 'test-rule-id',
      record.group_hash ?? 'test-group-hash',
      record.episode_id ?? 'episode-1',
      record.space_id ?? 'default',
    ]),
  };
}
