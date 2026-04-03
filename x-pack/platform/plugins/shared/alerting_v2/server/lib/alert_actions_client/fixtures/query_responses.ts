/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse, FieldValue } from '@elastic/elasticsearch/lib/api/types';

export function getAlertEventESQLResponse(overrides?: {
  '@timestamp'?: string;
  group_hash?: string;
  episode_id?: string;
  rule_id?: string;
}): EsqlQueryResponse {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'episode_id', type: 'keyword' },
      { name: 'rule_id', type: 'keyword' },
    ],
    values: [
      [
        overrides?.['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
        overrides?.group_hash ?? 'test-group-hash',
        overrides?.episode_id ?? 'episode-1',
        overrides?.rule_id ?? 'test-rule-id',
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
  }>
): EsqlQueryResponse {
  return {
    columns: [
      { name: '@timestamp', type: 'date' },
      { name: 'rule_id', type: 'keyword' },
      { name: 'group_hash', type: 'keyword' },
      { name: 'episode_id', type: 'keyword' },
    ],
    values: records.map((record) => [
      record['@timestamp'] ?? '2025-01-01T00:00:00.000Z',
      record.rule_id ?? 'test-rule-id',
      record.group_hash ?? 'test-group-hash',
      record.episode_id ?? 'episode-1',
    ]),
  };
}
