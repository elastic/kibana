/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { QueryLink } from '@kbn/streams-schema';
import { SecurityError } from '../streams/errors/security_error';
import type { QueryClient } from '../streams/assets/query/query_client';
import {
  readSignificantEventsFromAlertsIndices,
  V1_ALERTS_SOURCE,
  V2_ALERTS_SOURCE,
} from './read_significant_events_from_alerts_indices';

const makeQueryLink = (overrides: Partial<QueryLink> = {}): QueryLink => ({
  'asset.uuid': `uuid-${overrides['asset.id'] ?? 'q1'}`,
  'asset.type': 'query',
  'asset.id': (overrides['asset.id'] as string) ?? 'q1',
  query: {
    id: (overrides['asset.id'] as string) ?? 'q1',
    type: 'match',
    title: 'Test query',
    description: 'desc',
    esql: { query: 'FROM logs | WHERE body.text:"error"' },
    severity_score: 60,
  },
  stream_name: 'logs.test',
  rule_backed: true,
  rule_id: `rule-${overrides['asset.id'] ?? 'q1'}`,
  ...overrides,
});

interface Mocks {
  queryClient: jest.Mocked<QueryClient>;
  scopedClusterClient: jest.Mocked<IScopedClusterClient>;
  esqlQuery: jest.Mock;
}

const createMocks = (queryLinks: QueryLink[] = []): Mocks => {
  const esqlQuery = jest.fn();
  const scopedClusterClient = {
    asCurrentUser: {
      esql: { query: esqlQuery },
    },
  } as unknown as jest.Mocked<IScopedClusterClient>;

  const queryClient = {
    getQueryLinks: jest.fn().mockResolvedValue(queryLinks),
    findQueries: jest.fn().mockResolvedValue(queryLinks),
  } as unknown as jest.Mocked<QueryClient>;

  return { queryClient, scopedClusterClient, esqlQuery };
};

const makeEsError = (status: number, type: string, reason: string) =>
  new errors.ResponseError({
    statusCode: status,
    headers: {},
    warnings: [],
    meta: {} as unknown as TransportResult['meta'],
    body: { error: { type, reason } },
  } as TransportResult);

const makeStatsResponse = (
  rows: Array<{ rule_id: string; bucket: string; count: number }>,
  ruleIdColumn: 'rule_id' | 'rule_uuid' = 'rule_id'
) => ({
  columns: [
    { name: 'count', type: 'long' as const },
    { name: ruleIdColumn, type: 'keyword' as const },
    { name: 'bucket', type: 'date' as const },
  ],
  values: rows.map((r) => [r.count, r.rule_id, r.bucket]),
  took: 0,
});

const FROM = new Date('2026-01-01T00:00:00.000Z');
const TO = new Date('2026-01-01T00:05:00.000Z'); // 5 minutes => 6 buckets at 1m incl. boundaries
const BUCKET = '1m';

const defaultV2Params = {
  from: FROM,
  to: TO,
  bucketSize: BUCKET,
  alertsSource: V2_ALERTS_SOURCE,
};

describe('readSignificantEventsFromAlertsIndices', () => {
  it('returns an empty response and skips ES|QL when there are no query links', async () => {
    const { queryClient, scopedClusterClient, esqlQuery } = createMocks([]);

    const result = await readSignificantEventsFromAlertsIndices(defaultV2Params, {
      queryClient,
      scopedClusterClient,
    });

    expect(result).toEqual({ significant_events: [], aggregated_occurrences: [] });
    expect(esqlQuery).not.toHaveBeenCalled();
  });

  it('groups ES|QL rows into per-rule occurrences with gap filling (v2)', async () => {
    const linkA = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
    const linkB = makeQueryLink({ 'asset.id': 'qb', rule_id: 'rule-b' });
    const { queryClient, scopedClusterClient, esqlQuery } = createMocks([linkA, linkB]);

    esqlQuery.mockResolvedValueOnce(
      makeStatsResponse([
        { rule_id: 'rule-a', bucket: '2026-01-01T00:00:00.000Z', count: 2 },
        { rule_id: 'rule-a', bucket: '2026-01-01T00:02:00.000Z', count: 1 },
        { rule_id: 'rule-b', bucket: '2026-01-01T00:04:00.000Z', count: 3 },
      ])
    );

    const result = await readSignificantEventsFromAlertsIndices(defaultV2Params, {
      queryClient,
      scopedClusterClient,
    });

    const ruleA = result.significant_events.find(
      (e) => e.stream_name === 'logs.test' && e.id === 'qa'
    )!;
    const ruleB = result.significant_events.find((e) => e.id === 'qb')!;

    // 6 buckets at 1m across [00:00, 00:05] inclusive
    expect(ruleA.occurrences).toHaveLength(6);
    expect(ruleA.occurrences.map((o) => o.count)).toEqual([2, 0, 1, 0, 0, 0]);
    expect(ruleB.occurrences).toHaveLength(6);
    expect(ruleB.occurrences.map((o) => o.count)).toEqual([0, 0, 0, 0, 3, 0]);
  });

  it('emits an empty occurrences array (not a zero-filled series) for rules absent from the result', async () => {
    const linkFiring = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
    const linkSilent = makeQueryLink({ 'asset.id': 'qb', rule_id: 'rule-b' });
    const { queryClient, scopedClusterClient, esqlQuery } = createMocks([linkFiring, linkSilent]);

    esqlQuery.mockResolvedValueOnce(
      makeStatsResponse([{ rule_id: 'rule-a', bucket: '2026-01-01T00:01:00.000Z', count: 1 }])
    );

    const result = await readSignificantEventsFromAlertsIndices(defaultV2Params, {
      queryClient,
      scopedClusterClient,
    });

    const ruleA = result.significant_events.find((e) => e.id === 'qa')!;
    const ruleB = result.significant_events.find((e) => e.id === 'qb')!;

    expect(ruleA.occurrences).toHaveLength(6);
    expect(ruleB.occurrences).toEqual([]);
  });

  it('produces aggregated_occurrences summing per-bucket counts across all rules (v2)', async () => {
    const linkA = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
    const linkB = makeQueryLink({ 'asset.id': 'qb', rule_id: 'rule-b' });
    const { queryClient, scopedClusterClient, esqlQuery } = createMocks([linkA, linkB]);

    esqlQuery.mockResolvedValueOnce(
      makeStatsResponse([
        { rule_id: 'rule-a', bucket: '2026-01-01T00:00:00.000Z', count: 2 },
        { rule_id: 'rule-b', bucket: '2026-01-01T00:00:00.000Z', count: 3 },
        { rule_id: 'rule-a', bucket: '2026-01-01T00:02:00.000Z', count: 1 },
      ])
    );

    const result = await readSignificantEventsFromAlertsIndices(defaultV2Params, {
      queryClient,
      scopedClusterClient,
    });

    expect(result.aggregated_occurrences.map((b) => b.count)).toEqual([5, 0, 1, 0, 0, 0]);
  });

  it('returns an empty response when the v2 rule-events index is missing', async () => {
    const link = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
    const { queryClient, scopedClusterClient, esqlQuery } = createMocks([link]);

    esqlQuery.mockRejectedValueOnce(
      makeEsError(400, 'verification_exception', 'Unknown index [.rule-events]')
    );

    const result = await readSignificantEventsFromAlertsIndices(defaultV2Params, {
      queryClient,
      scopedClusterClient,
    });

    expect(result.significant_events).toHaveLength(1);
    expect(result.significant_events[0].occurrences).toEqual([]);
    expect(result.aggregated_occurrences).toEqual([]);
  });

  it('rethrows non-Unknown-index verification_exception (e.g. unknown column)', async () => {
    const link = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
    const { queryClient, scopedClusterClient, esqlQuery } = createMocks([link]);

    // Simulates an ES|QL regression — unknown column, malformed query, mapping
    // mismatch. Must NOT be silently swallowed as "alerts index missing".
    esqlQuery.mockRejectedValueOnce(
      makeEsError(400, 'verification_exception', 'Unknown column [kibana.alert.rule.bogus_field]')
    );

    await expect(
      readSignificantEventsFromAlertsIndices(defaultV2Params, {
        queryClient,
        scopedClusterClient,
      })
    ).rejects.toThrow(/verification_exception|Unknown column/);
  });

  it('rethrows security_exception as SecurityError with the underlying cause attached', async () => {
    const link = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
    const { queryClient, scopedClusterClient, esqlQuery } = createMocks([link]);

    const cause = makeEsError(403, 'security_exception', 'missing privileges');
    esqlQuery.mockRejectedValueOnce(cause);

    await expect(
      readSignificantEventsFromAlertsIndices(defaultV2Params, {
        queryClient,
        scopedClusterClient,
      })
    ).rejects.toBeInstanceOf(SecurityError);
  });

  it('rethrows unexpected errors (not security or verification exceptions)', async () => {
    const link = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
    const { queryClient, scopedClusterClient, esqlQuery } = createMocks([link]);

    const boom = new Error('cluster meltdown');
    esqlQuery.mockRejectedValueOnce(boom);

    await expect(
      readSignificantEventsFromAlertsIndices(defaultV2Params, {
        queryClient,
        scopedClusterClient,
      })
    ).rejects.toThrow('cluster meltdown');
  });

  it('returns the empty response shape when expected ES|QL columns are missing', async () => {
    const link = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
    const { queryClient, scopedClusterClient, esqlQuery } = createMocks([link]);

    // Simulate a future schema regression where `rule_id` is renamed/missing.
    esqlQuery.mockResolvedValueOnce({
      columns: [
        { name: 'count', type: 'long' as const },
        { name: 'bucket', type: 'date' as const },
      ],
      values: [[1, '2026-01-01T00:00:00.000Z']],
      took: 0,
    });

    const result = await readSignificantEventsFromAlertsIndices(defaultV2Params, {
      queryClient,
      scopedClusterClient,
    });

    expect(result.significant_events).toHaveLength(1);
    expect(result.significant_events[0].occurrences).toEqual([]);
    expect(result.aggregated_occurrences).toEqual([]);
  });

  it('converts route-style bucket sizes ("1m") into ES|QL units ("minutes") in the v2 rendered query', async () => {
    const link = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
    const { queryClient, scopedClusterClient, esqlQuery } = createMocks([link]);

    esqlQuery.mockResolvedValueOnce(makeStatsResponse([]));

    await readSignificantEventsFromAlertsIndices(
      { ...defaultV2Params, bucketSize: '1m' },
      { queryClient, scopedClusterClient }
    );

    expect(esqlQuery).toHaveBeenCalledTimes(1);
    const calledWith = esqlQuery.mock.calls[0][0] as { query: string };
    expect(calledWith.query).toEqual(expect.stringContaining('minutes'));
    expect(calledWith.query).toEqual(expect.stringContaining('.rule-events'));
    expect(calledWith.query).not.toMatch(/BUCKET\([^)]*1m\)/);
  });

  describe('v1 alerts source', () => {
    const defaultV1Params = {
      from: FROM,
      to: TO,
      bucketSize: BUCKET,
      alertsSource: V1_ALERTS_SOURCE,
    };

    it('queries .alerts-streams.alerts-default with kibana.alert.rule.uuid', async () => {
      const link = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
      const { queryClient, scopedClusterClient, esqlQuery } = createMocks([link]);

      esqlQuery.mockResolvedValueOnce(
        makeStatsResponse(
          [{ rule_id: 'rule-a', bucket: '2026-01-01T00:00:00.000Z', count: 1 }],
          'rule_uuid'
        )
      );

      await readSignificantEventsFromAlertsIndices(defaultV1Params, {
        queryClient,
        scopedClusterClient,
      });

      const calledWith = esqlQuery.mock.calls[0][0] as { query: string };
      expect(calledWith.query).toEqual(expect.stringContaining('.alerts-streams.alerts-default'));
      expect(calledWith.query).toEqual(expect.stringContaining('COUNT(*)'));
      expect(calledWith.query).not.toEqual(expect.stringContaining('COUNT_DISTINCT'));
    });

    it('returns an empty response when the v1 alerts index is missing', async () => {
      const link = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
      const { queryClient, scopedClusterClient, esqlQuery } = createMocks([link]);

      esqlQuery.mockRejectedValueOnce(
        makeEsError(400, 'verification_exception', 'Unknown index [.alerts-streams.alerts-default]')
      );

      const result = await readSignificantEventsFromAlertsIndices(defaultV1Params, {
        queryClient,
        scopedClusterClient,
      });

      expect(result.significant_events[0].occurrences).toEqual([]);
    });

    it('defaults to v1 when alertsSource is omitted', async () => {
      const link = makeQueryLink({ 'asset.id': 'qa', rule_id: 'rule-a' });
      const { queryClient, scopedClusterClient, esqlQuery } = createMocks([link]);

      esqlQuery.mockResolvedValueOnce(makeStatsResponse([]));

      await readSignificantEventsFromAlertsIndices(
        { from: FROM, to: TO, bucketSize: BUCKET },
        { queryClient, scopedClusterClient }
      );

      const calledWith = esqlQuery.mock.calls[0][0] as { query: string };
      expect(calledWith.query).toEqual(expect.stringContaining('.alerts-streams.alerts-default'));
    });
  });
});
