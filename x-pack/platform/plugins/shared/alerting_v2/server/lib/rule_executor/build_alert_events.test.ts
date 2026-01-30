/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlResult } from '@elastic/elasticsearch/lib/api/types';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import { buildAlertEventsFromEsqlResponse } from './build_alert_events';

describe('buildAlertEventsFromEsqlResponse', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('transforms ES|QL response rows into alert documents', () => {
    const ruleAttributes: RuleSavedObjectAttributes = {
      name: 'My ES|QL Rule',
      tags: ['esql', 'test'],
      schedule: { custom: '1m' },
      enabled: true,
      query: 'FROM idx | STATS count = COUNT(*) BY host.name',
      timeField: '@timestamp',
      lookbackWindow: '5m',
      groupingKey: ['host.name', 'region'],
      createdBy: 'u',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedBy: 'u',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const esqlResponse: EsqlEsqlResult = {
      columns: [
        { name: 'host.name', type: 'keyword' },
        { name: 'region', type: 'keyword' },
        { name: 'count', type: 'number' },
      ],
      values: [
        ['host-a', 'us-east', 10],
        ['host-b', 'eu-west', 5],
      ],
    };

    const docs = buildAlertEventsFromEsqlResponse({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes,
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(docs).toHaveLength(2);

    const doc1 = docs[0];
    const doc2 = docs[1];

    expect(doc1['@timestamp']).toBe('2025-01-01T00:00:00.000Z');
    expect(doc1.scheduled_timestamp).toBe('2024-12-31T23:59:00.000Z');
    expect(doc1.rule).toEqual({ id: 'rule-123', version: 1 });
    expect(doc1.group_hash).toEqual(expect.any(String));
    expect(doc1.data).toEqual({ 'host.name': 'host-a', region: 'us-east', count: 10 });
    expect(doc1.status).toBe('breached');
    expect(doc1.source).toBe('internal');
    expect(doc1.type).toBe('signal');

    expect(doc2.group_hash).toEqual(expect.any(String));
    expect(doc2.data).toEqual({ 'host.name': 'host-b', region: 'eu-west', count: 5 });

    // Different grouping should produce different group_hash
    expect(doc1.group_hash).not.toEqual(doc2.group_hash);
  });
});
