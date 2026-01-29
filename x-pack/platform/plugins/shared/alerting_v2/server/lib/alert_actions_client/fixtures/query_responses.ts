/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

export function getAlertEventESQLResponse(overrides?: {
  '@timestamp'?: string;
  group_hash?: string;
  episode_id?: string;
  rule_id?: string;
}): ESQLSearchResponse {
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

export function getEmptyESQLResponse(): ESQLSearchResponse {
  return {
    columns: [],
    values: [],
  };
}

export function getBulkAlertEventsESQLResponse(
  records: Array<{
    '@timestamp'?: string;
    group_hash?: string;
    episode_id?: string;
    rule_id?: string;
  }>
): ESQLSearchResponse {
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
