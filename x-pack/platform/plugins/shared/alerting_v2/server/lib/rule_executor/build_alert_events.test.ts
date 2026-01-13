/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSavedObjectAttributes } from '../../saved_objects';
import type { ESQLSearchResponse } from '@kbn/es-types';
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
      groupingKey: ['host.name'],
      createdBy: 'u',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedBy: 'u',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const esqlResponse: ESQLSearchResponse = {
      columns: [{ name: 'host.name' }, { name: 'count' }],
      values: [
        ['host-a', 10],
        ['host-b', 5],
      ],
    } as unknown as ESQLSearchResponse;

    const docs = buildAlertEventsFromEsqlResponse({
      input: {
        ruleId: 'rule-123',
        spaceId: 'default',
        ruleAttributes,
        esqlResponse,
        scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      },
    });

    expect(docs).toHaveLength(2);
    expect(docs[0].id).toEqual(expect.any(String));
    expect(docs[1].id).toEqual(expect.any(String));
    expect(docs[0].id).not.toEqual(docs[1].id);

    const doc1 = docs[0].doc;
    const doc2 = docs[1].doc;

    expect(doc1['@timestamp']).toBe('2025-01-01T00:00:00.000Z');
    expect(doc1.scheduled_timestamp).toBe('2024-12-31T23:59:00.000Z');
    expect(doc1.tags).toEqual(['esql', 'test']);
    expect(doc1.rule).toEqual({ id: 'rule-123', tags: ['esql', 'test'] });
    expect(doc1.grouping).toEqual({ key: 'host.name', value: 'host-a' });
    expect(doc1.data).toEqual({ 'host.name': 'host-a', count: 10 });
    expect(doc1.status).toBe('breach');
    expect(doc1.source).toBe('internal');
    expect(doc1.alert_series_id).toEqual(expect.any(String));

    expect(doc2.grouping).toEqual({ key: 'host.name', value: 'host-b' });
    expect(doc2.data).toEqual({ 'host.name': 'host-b', count: 5 });
  });
});

