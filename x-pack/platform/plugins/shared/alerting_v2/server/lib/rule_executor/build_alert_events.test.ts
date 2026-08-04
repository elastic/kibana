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
  buildContinuedBreachAlertEvents,
  buildNoDataAlertEvents,
  resolveAlertEventType,
} from './build_alert_events';
import type { BuildAlertEventsBaseOpts } from './build_alert_events';

const DEFAULT_MAX_DOC_SIZE_BYTES = 5000;

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
  return buildBatch(rows).alertEvents;
}

describe('resolveAlertEventType', () => {
  it('maps rule.kind "alert" to event type "alert" (stateful rules)', () => {
    expect(resolveAlertEventType({ kind: 'alert' })).toBe('alert');
  });

  it('maps rule.kind "signal" to event type "signal" (stateless rules)', () => {
    expect(resolveAlertEventType({ kind: 'signal' })).toBe('signal');
  });

  it('is exhaustive: throws on an unhandled rule.kind at runtime', () => {
    const unknownRule = { kind: 'not-a-rule-kind' };

    // @ts-expect-error: unknown rule.kind
    expect(() => resolveAlertEventType(unknownRule)).toThrow(
      'Unhandled rule.kind: not-a-rule-kind'
    );
  });
});

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
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    const { alertEvents: docs, truncatedEventsCount } = buildBatch(rows);

    expect(docs).toHaveLength(2);
    expect(truncatedEventsCount).toBe(0);

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
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    const { alertEvents: docs } = buildBatch([{ 'host.name': 'host-a' }]);

    expect(docs).toHaveLength(1);
    expect(docs[0].space_id).toBe('custom-space');
  });

  describe('severity', () => {
    const buildBatchOnce = (rows: Array<Record<string, unknown>>) =>
      createAlertEventsBatchBuilder({
        ruleId: 'rule-123',
        ruleVersion: 1,
        spaceId: 'default',
        ruleAttributes: { grouping: { fields: ['host.name'] } },
        scheduledTimestamp: '2024-12-31T23:59:00.000Z',
        type: 'signal',
        maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
      })(rows).alertEvents;

    it.each(['info', 'low', 'medium', 'high', 'critical'] as const)(
      'sets severity to %s when the row has a matching severity column',
      (severity) => {
        const [doc] = buildBatchOnce([{ 'host.name': 'host-a', severity }]);

        expect(doc.severity).toBe(severity);
      }
    );

    it('lowercases the severity value before matching', () => {
      const [doc] = buildBatchOnce([{ 'host.name': 'host-a', severity: 'CRITICAL' }]);

      expect(doc.severity).toBe('critical');
    });

    it('lowercases mixed-case severity values', () => {
      const [doc] = buildBatchOnce([{ 'host.name': 'host-a', severity: 'HiGh' }]);

      expect(doc.severity).toBe('high');
    });

    it('does not set severity when the value is not in the supported set', () => {
      const [doc] = buildBatchOnce([{ 'host.name': 'host-a', severity: 'SEV1' }]);

      expect(doc.severity).toBeUndefined();
    });

    it('does not set severity when the value is not a string', () => {
      const [doc] = buildBatchOnce([{ 'host.name': 'host-a', severity: 5 }]);

      expect(doc.severity).toBeUndefined();
    });

    it('does not set severity when the value is null', () => {
      const [doc] = buildBatchOnce([{ 'host.name': 'host-a', severity: null }]);

      expect(doc.severity).toBeUndefined();
    });

    it('does not set severity when the row has no severity column', () => {
      const [doc] = buildBatchOnce([{ 'host.name': 'host-a' }]);

      expect(doc.severity).toBeUndefined();
    });

    it('keeps the original severity value in the data attribute', () => {
      const [doc] = buildBatchOnce([{ 'host.name': 'host-a', severity: 'CRITICAL' }]);

      expect(doc.data).toEqual({ 'host.name': 'host-a', severity: 'CRITICAL' });
    });

    it('keeps the unsupported severity value in the data attribute', () => {
      const [doc] = buildBatchOnce([{ 'host.name': 'host-a', severity: 'SEV1' }]);

      expect(doc.data).toEqual({ 'host.name': 'host-a', severity: 'SEV1' });
    });
  });

  describe('maxDocSize guardrail', () => {
    const buildBatchWithLimit = (maxDocSizeBytes: number) =>
      createAlertEventsBatchBuilder({
        ruleId: 'rule-123',
        ruleVersion: 1,
        spaceId: 'default',
        ruleAttributes: { grouping: { fields: ['host.name'] } },
        scheduledTimestamp: '2024-12-31T23:59:00.000Z',
        type: 'signal',
        maxDocSizeBytes,
      });

    it('truncates oversized rows down to grouping fields, flags and counts them', () => {
      const buildBatch = buildBatchWithLimit(200);

      const { alertEvents, truncatedEventsCount } = buildBatch([
        { 'host.name': 'host-a', message: 'x'.repeat(500) },
        { 'host.name': 'host-b', message: 'small' },
      ]);

      expect(truncatedEventsCount).toBe(1);
      expect(alertEvents[0].data).toEqual({ 'host.name': 'host-a' });
      expect(alertEvents[0].data_truncated).toBe(true);
      expect(alertEvents[1].data).toEqual({ 'host.name': 'host-b', message: 'small' });
      expect(alertEvents[1].data_truncated).toBeUndefined();
    });

    it('keeps the group hash stable across truncated and non-truncated runs of the same group', () => {
      const bigRow = { 'host.name': 'host-a', message: 'x'.repeat(500) };
      const smallRow = { 'host.name': 'host-a', message: 'small' };

      const { alertEvents: truncatedEvents } = buildBatchWithLimit(200)([bigRow]);
      const { alertEvents: intactEvents } = buildBatchWithLimit(5000)([smallRow]);

      expect(truncatedEvents[0].data_truncated).toBe(true);
      // Same grouping value → same hash, regardless of truncation.
      expect(truncatedEvents[0].group_hash).toBe(intactEvents[0].group_hash);
    });

    it('clips an oversized grouping field value instead of dropping it', () => {
      const buildBatch = buildBatchWithLimit(200);

      const { alertEvents, truncatedEventsCount } = buildBatch([{ 'host.name': 'h'.repeat(500) }]);

      expect(truncatedEventsCount).toBe(1);
      expect(alertEvents[0].data_truncated).toBe(true);
      const data = alertEvents[0].data as Record<string, unknown>;
      expect(data['host.name']).toEqual(expect.stringMatching(/^h+$/));
      expect((data['host.name'] as string).length).toBeLessThan(200);
      expect(JSON.stringify(data).length).toBeLessThanOrEqual(200);
    });

    it('still derives severity from the full row when data is truncated', () => {
      const buildBatch = buildBatchWithLimit(200);

      const { alertEvents } = buildBatch([
        { 'host.name': 'host-a', severity: 'critical', message: 'x'.repeat(500) },
      ]);

      expect(alertEvents[0].severity).toBe('critical');
      expect(alertEvents[0].data_truncated).toBe(true);
      expect(alertEvents[0].data).toEqual({ 'host.name': 'host-a' });
    });
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
      type: 'signal',
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
      type: 'signal',
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
      type: 'signal',
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
      type: 'signal',
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
      type: 'signal',
    });

    expect(events).toHaveLength(1);
    expect(events[0].space_id).toBe('custom-space');
  });

  describe('with dataPresentGroupHashes', () => {
    it('only recovers absent groups that still have data', () => {
      const events = buildRecoveryAlertEvents({
        ruleId: 'rule-123',
        ruleVersion: 1,
        spaceId: 'default',
        activeGroupHashes: [
          { group_hash: 'hash-a' },
          { group_hash: 'hash-b' },
          { group_hash: 'hash-c' },
        ],
        breachedGroupHashes: new Set(['hash-a']),
        // hash-b has data (recovers); hash-c has no data (left for no-data step).
        dataPresentGroupHashes: new Set(['hash-b']),
        scheduledTimestamp: '2024-12-31T23:59:00.000Z',
        type: 'signal',
      });

      expect(events).toHaveLength(1);
      expect(events[0].group_hash).toBe('hash-b');
      expect(events[0].status).toBe('recovered');
    });

    it('recovers all absent groups when dataPresentGroupHashes is undefined (fallback)', () => {
      const events = buildRecoveryAlertEvents({
        ruleId: 'rule-123',
        ruleVersion: 1,
        spaceId: 'default',
        activeGroupHashes: [{ group_hash: 'hash-a' }, { group_hash: 'hash-b' }],
        breachedGroupHashes: new Set(['hash-a']),
        dataPresentGroupHashes: undefined,
        scheduledTimestamp: '2024-12-31T23:59:00.000Z',
        type: 'signal',
      });

      expect(events).toHaveLength(1);
      expect(events[0].group_hash).toBe('hash-b');
    });
  });
});

describe('buildContinuedBreachAlertEvents', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('creates breached events with an empty data payload for the supplied group hashes', () => {
    const events = buildContinuedBreachAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      groupHashes: ['hash-a', 'hash-b'],
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      scheduled_timestamp: '2024-12-31T23:59:00.000Z',
      rule: { id: 'rule-123', version: 1 },
      group_hash: 'hash-a',
      data: {},
      status: 'breached',
      source: 'internal',
      type: 'signal',
      space_id: 'default',
    });
    expect(events.every((e) => e.status === 'breached')).toBe(true);
  });

  it('returns an empty array when there are no group hashes', () => {
    const events = buildContinuedBreachAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      groupHashes: [],
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
    });

    expect(events).toEqual([]);
  });
});

describe('buildNoDataAlertEvents', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('creates no_data events with an empty data payload for the supplied group hashes', () => {
    const events = buildNoDataAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      groupHashes: ['hash-a', 'hash-b'],
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
    });

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      '@timestamp': '2025-01-01T00:00:00.000Z',
      scheduled_timestamp: '2024-12-31T23:59:00.000Z',
      rule: { id: 'rule-123', version: 1 },
      group_hash: 'hash-a',
      data: {},
      status: 'no_data',
      source: 'internal',
      type: 'signal',
      space_id: 'default',
    });
    expect(events.map((e) => e.group_hash)).toEqual(['hash-a', 'hash-b']);
    expect(events.every((e) => e.status === 'no_data')).toBe(true);
  });

  it('returns an empty array when there are no group hashes', () => {
    const events = buildNoDataAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      groupHashes: [],
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
    });

    expect(events).toEqual([]);
  });

  it('sets space_id on no_data alert events from the provided spaceId', () => {
    const events = buildNoDataAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'custom-space',
      groupHashes: ['hash-a'],
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
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
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    const activeGroupHash = breachedEvents[0].group_hash;

    const { alertEvents: events } = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: activeGroupHash }],
      breachedGroupHashes: new Set(),
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
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
    const { alertEvents: events } = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: 'hash-a' }],
      breachedGroupHashes: new Set(),
      esqlResponse: { columns: [], values: [] },
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    expect(events).toEqual([]);
  });

  it('ignores recovery query rows that do not match any active group', () => {
    const esqlResponse: EsqlQueryResponse = {
      columns: [{ name: 'host.name', type: 'keyword' }],
      values: [['host-unknown']],
    };

    const { alertEvents: events } = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: 'hash-not-matching' }],
      breachedGroupHashes: new Set(),
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
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
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    const activeGroupHash = breachedEvents[0].group_hash;

    const { alertEvents: events } = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: activeGroupHash }],
      breachedGroupHashes: new Set(),
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    expect(events).toHaveLength(1);
    expect(events[0].group_hash).toBe(activeGroupHash);
    expect(events[0].data).toEqual({ 'host.name': 'host-a', msg: 'recovered-1' });
  });

  it('excludes groups that are breaching this run even when the recovery query matches them', () => {
    const esqlResponse: EsqlQueryResponse = {
      columns: [{ name: 'host.name', type: 'keyword' }],
      values: [['host-a']],
    };

    const breachedEvents = buildAlertEventsFromEsqlResponse({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    const activeGroupHash = breachedEvents[0].group_hash;

    const { alertEvents: events } = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: activeGroupHash }],
      // host-a is breaching this run: breach wins, no recovery event.
      breachedGroupHashes: new Set([activeGroupHash]),
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    expect(events).toEqual([]);
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
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    const { alertEvents: events } = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'custom-space',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: breachedEvents[0].group_hash }],
      breachedGroupHashes: new Set(),
      esqlResponse,
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    expect(events).toHaveLength(1);
    expect(events[0].space_id).toBe('custom-space');
  });

  it('truncates the data payload of oversized recovery rows', () => {
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
      type: 'signal',
      maxDocSizeBytes: DEFAULT_MAX_DOC_SIZE_BYTES,
    });

    const { alertEvents: events, truncatedEventsCount } = buildQueryRecoveryAlertEvents({
      ruleId: 'rule-123',
      ruleVersion: 1,
      spaceId: 'default',
      ruleAttributes: { grouping: { fields: ['host.name'] } },
      activeGroupHashes: [{ group_hash: breachedEvents[0].group_hash }],
      breachedGroupHashes: new Set(),
      esqlResponse: {
        columns: [
          { name: 'host.name', type: 'keyword' },
          { name: 'message', type: 'keyword' },
        ],
        values: [['host-a', 'x'.repeat(500)]],
      },
      scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      type: 'signal',
      maxDocSizeBytes: 200,
    });

    expect(events).toHaveLength(1);
    expect(events[0].group_hash).toBe(breachedEvents[0].group_hash);
    expect(events[0].data).toEqual({ 'host.name': 'host-a' });
    expect(events[0].data_truncated).toBe(true);
    expect(truncatedEventsCount).toBe(1);
  });
});
