/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  createAlertEventsBatchBuilder,
  buildRecoveryAlertEvents,
  buildQueryRecoveryAlertEvents,
} from './build_alert_events';
import type { BuildAlertEventsBaseOpts } from './build_alert_events';

function buildAlertEventsFromEsqlResponse(
  opts: BuildAlertEventsBaseOpts & { esqlResponse: EsqlQueryResponse }
) {
  const { esqlResponse, ...baseOpts } = opts;
  const buildBatch = createAlertEventsBatchBuilder(baseOpts);
  const rows = (esqlResponse.values ?? []).map((row) => {
    const record: Record<string, unknown> = {};
    (esqlResponse.columns ?? []).forEach((col, i) => {
      record[col.name] = row[i];
    });
    return record;
  });
  return buildBatch(rows);
}

describe('createAlertEventsBatchBuilder', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('transforms ES|QL rows into alert documents', () => {
    const rows = [
      { 'host.name': 'host-a', region: 'us-east', count: 10 },
      { 'host.name': 'host-b', region: 'eu-west', count: 5 },
    ];

    const buildBatch = createAlertEventsBatchBuilder({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name', 'region'] } },
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    const docs = buildBatch(rows);

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
    expect(doc1.space_id).toBe('default');

    expect(doc2.group_hash).toEqual(expect.any(String));
    expect(doc2.data).toEqual({ 'host.name': 'host-b', region: 'eu-west', count: 5 });

    // Different grouping should produce different group_hash
    expect(doc1.group_hash).not.toEqual(doc2.group_hash);
  });

  it('sets space_id on breached alert events from the provided spaceId', () => {
    const buildBatch = createAlertEventsBatchBuilder({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'custom-space',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    const docs = buildBatch([{ 'host.name': 'host-a' }]);

    expect(docs).toHaveLength(1);
    expect(docs[0].space_id).toBe('custom-space');
  });
});

describe('buildRecoveryAlertEvents', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('creates recovered events for active groups not in the breached set', () => {
    const events = buildRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      activeGroupHashes: [{ group_hash: 'hash-a' }, { group_hash: 'hash-b' }],
      breachedGroupHashes: new Set(['hash-a']),
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      scheduled_timestamp: '2024-12-31T23:59:00.000Z',
      rule: { id: 'rule-123', version: 1 },
      group_hash: 'hash-b',
      data: {},
      status: 'recovered',
      source: 'internal',
      type: 'signal',
      space_id: 'default',
    });
  });

  it('returns empty array when all active groups are still breaching', () => {
    const events = buildRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      activeGroupHashes: [{ group_hash: 'hash-a' }],
      breachedGroupHashes: new Set(['hash-a']),
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(events).toEqual([]);
  });

  it('returns recovered events for all active groups when none are breaching', () => {
    const events = buildRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      activeGroupHashes: [{ group_hash: 'hash-a' }, { group_hash: 'hash-b' }],
      breachedGroupHashes: new Set(),
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(events).toHaveLength(2);
    expect(events.map((e) => e.group_hash)).toEqual(['hash-a', 'hash-b']);
    expect(events.every((e) => e.status === 'recovered')).toBe(true);
  });

  it('returns empty array when there are no active groups', () => {
    const events = buildRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      activeGroupHashes: [],
      breachedGroupHashes: new Set(['hash-a']),
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(events).toEqual([]);
  });

  it('sets space_id on recovered alert events from the provided spaceId', () => {
    const events = buildRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'custom-space',
      activeGroupHashes: [{ group_hash: 'hash-a' }],
      breachedGroupHashes: new Set(),
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(events).toHaveLength(1);
    expect(events[0].space_id).toBe('custom-space');
  });
});

describe('buildQueryRecoveryAlertEvents', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('creates recovered events for active groups matching the recovery query', () => {
    const esqlResponse: EsqlQueryResponse = {
      columns: [
        { name: 'host.name', type: 'keyword' },
        { name: 'status', type: 'keyword' },
      ],
      values: [['host-a', 'ok']],
    };

    // Build a breached event first to know the expected group_hash
    const breachedEvents = buildAlertEventsFromEsqlResponse({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      esqlResponse: {
        columns: [{ name: 'host.name', type: 'keyword' }],
        values: [['host-a']],
      },
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    const activeGroupHash = breachedEvents[0].group_hash;

    const events = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: activeGroupHash }],
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      scheduled_timestamp: '2024-12-31T23:59:00.000Z',
      rule: { id: 'rule-123', version: 1 },
      group_hash: activeGroupHash,
      data: { 'host.name': 'host-a', status: 'ok' },
      status: 'recovered',
      source: 'internal',
      type: 'signal',
      space_id: 'default',
    });
  });

  it('returns empty array when recovery query returns no rows', () => {
    const events = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: 'hash-a' }],
      esqlResponse: { columns: [], values: [] },
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(events).toEqual([]);
  });

  it('ignores recovery query rows that do not match any active group', () => {
    const esqlResponse: EsqlQueryResponse = {
      columns: [{ name: 'host.name', type: 'keyword' }],
      values: [['host-unknown']],
    };

    const events = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: 'hash-not-matching' }],
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(events).toEqual([]);
  });

  it('deduplicates when multiple recovery rows produce the same group hash', () => {
    const esqlResponse: EsqlQueryResponse = {
      columns: [
        { name: 'host.name', type: 'keyword' },
        { name: 'msg', type: 'keyword' },
      ],
      values: [
        ['host-a', 'recovered-1'],
        ['host-a', 'recovered-2'],
      ],
    };

    const breachedEvents = buildAlertEventsFromEsqlResponse({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      esqlResponse: {
        columns: [{ name: 'host.name', type: 'keyword' }],
        values: [['host-a']],
      },
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    const activeGroupHash = breachedEvents[0].group_hash;

    const events = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: activeGroupHash }],
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(events).toHaveLength(1);
    expect(events[0].group_hash).toBe(activeGroupHash);
    expect(events[0].data).toEqual({ 'host.name': 'host-a', msg: 'recovered-1' });
  });

  it('sets space_id on query-recovered alert events from the provided spaceId', () => {
    const esqlResponse: EsqlQueryResponse = {
      columns: [{ name: 'host.name', type: 'keyword' }],
      values: [['host-a']],
    };

    const breachedEvents = buildAlertEventsFromEsqlResponse({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'custom-space',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    const events = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'custom-space',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: breachedEvents[0].group_hash }],
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
    });

    expect(events).toHaveLength(1);
    expect(events[0].space_id).toBe('custom-space');
  });
});
