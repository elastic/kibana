/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { createTestEsCluster, type EsTestCluster } from '@kbn/test';
import {
  ALERT_END,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_RULE_UUID,
  ALERT_WORKFLOW_STATUS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { buildClassicAlertsQuery, buildClassicAlertsSort } from '../utils/query';
import { CLASSIC_SEVERITY_EXTENSIONS } from '../create_classic_episode_source';
import { fetchClassicAlertsHistogram } from '../apis/fetch_classic_histogram';
import { mapClassicStatusToEpisodeStatus } from '../utils/map_alert';
import {
  computeOverlapCounts,
  generateTimeBuckets,
  mergeBucketCounts,
  type HistogramBucketCount,
  type HistogramEpisodeRow,
} from '../../utils/histogram_utils';

const TEST_INDEX = 'test-classic-alerts';
const HISTOGRAM_INDEX = 'test-classic-alerts-histogram';

describe('classic alerts query builders', () => {
  let esServer: EsTestCluster;
  let esClient: Client;

  beforeAll(async () => {
    jest.setTimeout(60_000);

    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'info' }),
    });
    await esServer.start();
    esClient = esServer.getClient();

    await esClient.indices.create({
      index: TEST_INDEX,
      mappings: {
        properties: {
          [TIMESTAMP]: { type: 'date' },
          [ALERT_SEVERITY]: { type: 'keyword' },
          [ALERT_STATUS]: { type: 'keyword' },
          [ALERT_RULE_UUID]: { type: 'keyword' },
        },
      },
    });

    const docs = [
      {
        [ALERT_SEVERITY]: 'info',
        [ALERT_STATUS]: 'active',
        [ALERT_RULE_UUID]: 'rule-1',
        [TIMESTAMP]: '2024-01-01T01:00:00Z',
      },
      {
        [ALERT_SEVERITY]: 'critical',
        [ALERT_STATUS]: 'active',
        [ALERT_RULE_UUID]: 'rule-1',
        [TIMESTAMP]: '2024-01-01T02:00:00Z',
      },
      {
        [ALERT_SEVERITY]: 'low',
        [ALERT_STATUS]: 'recovered',
        [ALERT_RULE_UUID]: 'rule-2',
        [TIMESTAMP]: '2024-01-01T03:00:00Z',
      },
      {
        [ALERT_SEVERITY]: 'high',
        [ALERT_STATUS]: 'active',
        [ALERT_RULE_UUID]: 'rule-2',
        [TIMESTAMP]: '2024-01-01T04:00:00Z',
      },
      {
        [ALERT_SEVERITY]: 'medium',
        [ALERT_STATUS]: 'active',
        [ALERT_RULE_UUID]: 'rule-1',
        [TIMESTAMP]: '2024-01-01T05:00:00Z',
      },
      {
        [ALERT_SEVERITY]: 'warning',
        [ALERT_STATUS]: 'active',
        [ALERT_RULE_UUID]: 'rule-1',
        [TIMESTAMP]: '2024-01-01T06:00:00Z',
      },
      {
        [ALERT_SEVERITY]: 'major',
        [ALERT_STATUS]: 'active',
        [ALERT_RULE_UUID]: 'rule-1',
        [TIMESTAMP]: '2024-01-01T07:00:00Z',
      },
      {
        [ALERT_SEVERITY]: 'minor',
        [ALERT_STATUS]: 'active',
        [ALERT_RULE_UUID]: 'rule-1',
        [TIMESTAMP]: '2024-01-01T08:00:00Z',
      },
      {
        [ALERT_STATUS]: 'active',
        [ALERT_RULE_UUID]: 'rule-3',
        [TIMESTAMP]: '2024-01-01T09:00:00Z',
      },
    ];

    await esClient.bulk({
      index: TEST_INDEX,
      refresh: 'wait_for',
      operations: docs.flatMap((doc) => [{ index: {} }, doc]),
    });
  });

  afterAll(async () => {
    await esServer?.stop();
  });

  describe('buildClassicAlertsSort', () => {
    it('sorts by severity descending (critical first, unknowns last)', async () => {
      const result = await esClient.search({
        index: TEST_INDEX,
        size: 20,
        query: { match_all: {} },
        sort: buildClassicAlertsSort(
          { sortField: 'severity', sortDirection: 'desc' },
          CLASSIC_SEVERITY_EXTENSIONS
        ),
        _source: [ALERT_SEVERITY],
      });

      const severities = result.hits.hits.map(
        (hit) => (hit._source as Record<string, unknown>)?.[ALERT_SEVERITY] ?? null
      );
      expect(severities).toEqual([
        'critical',
        'major',
        'high',
        'medium',
        'minor',
        'low',
        'warning',
        'info',
        null,
      ]);
    });

    it('sorts by severity ascending (unknowns first, critical last)', async () => {
      const result = await esClient.search({
        index: TEST_INDEX,
        size: 20,
        query: { match_all: {} },
        sort: buildClassicAlertsSort(
          { sortField: 'severity', sortDirection: 'asc' },
          CLASSIC_SEVERITY_EXTENSIONS
        ),
        _source: [ALERT_SEVERITY],
      });

      const severities = result.hits.hits.map(
        (hit) => (hit._source as Record<string, unknown>)?.[ALERT_SEVERITY] ?? null
      );
      expect(severities).toEqual([
        null,
        'info',
        'warning',
        'low',
        'minor',
        'medium',
        'high',
        'major',
        'critical',
      ]);
    });
  });

  describe('buildClassicAlertsQuery', () => {
    const search = async (query: ReturnType<typeof buildClassicAlertsQuery>) => {
      const result = await esClient.search({
        index: TEST_INDEX,
        size: 20,
        query,
        _source: [ALERT_SEVERITY, ALERT_STATUS, ALERT_RULE_UUID],
      });
      return result.hits.hits.map((hit) => hit._source as Record<string, unknown>);
    };

    it('filters by status', async () => {
      const query = buildClassicAlertsQuery({ status: ['inactive'] });
      const hits = await search(query);

      expect(hits).toHaveLength(1);
      expect(hits[0][ALERT_STATUS]).toBe('recovered');
    });

    it('filters by ruleId', async () => {
      const query = buildClassicAlertsQuery({ ruleId: 'rule-2' });
      const hits = await search(query);

      expect(hits).toHaveLength(2);
      expect(hits.every((h) => h[ALERT_RULE_UUID] === 'rule-2')).toBe(true);
    });

    it('filters by severity', async () => {
      const query = buildClassicAlertsQuery({ severity: ['critical'] });
      const hits = await search(query);

      expect(hits).toHaveLength(1);
      expect(hits[0][ALERT_SEVERITY]).toBe('critical');
    });

    it('filters warning without including medium documents', async () => {
      const query = buildClassicAlertsQuery({ severity: ['warning'] });
      const hits = await search(query);

      expect(hits).toHaveLength(1);
      expect(hits[0][ALERT_SEVERITY]).toBe('warning');
    });

    it('filters medium without including warning documents', async () => {
      const query = buildClassicAlertsQuery({ severity: ['medium'] });
      const hits = await search(query);

      expect(hits).toHaveLength(1);
      expect(hits[0][ALERT_SEVERITY]).toBe('medium');
    });

    it('filters by search text', async () => {
      const query = buildClassicAlertsQuery({ queryString: `${ALERT_SEVERITY}:critical` });
      const hits = await search(query);

      expect(hits).toHaveLength(1);
      expect(hits[0][ALERT_SEVERITY]).toBe('critical');
    });

    it('excludes all results when assigneeUid is set', async () => {
      const query = buildClassicAlertsQuery({ assigneeUid: 'user-1' });
      const hits = await search(query);

      expect(hits).toHaveLength(0);
    });
  });

  describe('fetchClassicAlertsHistogram (range aggregations)', () => {
    const HOUR = 3_600_000;
    const T0 = Date.parse('2024-01-01T00:00:00.000Z');
    const NOW = T0 + 3.5 * HOUR;
    const buckets = generateTimeBuckets(T0, T0 + 5 * HOUR, '1h');

    const alerts: Array<Record<string, string | undefined>> = [
      // ends exactly on a bucket boundary: only the first bucket
      {
        [TIMESTAMP]: '2024-01-01T01:00:00.000Z',
        [ALERT_START]: '2024-01-01T00:10:00.000Z',
        [ALERT_END]: '2024-01-01T01:00:00.000Z',
        [ALERT_STATUS]: 'recovered',
        [ALERT_RULE_UUID]: 'rule-1',
        [ALERT_WORKFLOW_STATUS]: 'open',
      },
      {
        [TIMESTAMP]: '2024-01-01T02:30:00.000Z',
        [ALERT_START]: '2024-01-01T00:30:00.000Z',
        [ALERT_END]: '2024-01-01T02:30:00.000Z',
        [ALERT_STATUS]: 'recovered',
        [ALERT_RULE_UUID]: 'rule-1',
      },
      // open alert: counted up to now, never in future buckets
      {
        [TIMESTAMP]: '2024-01-01T03:00:00.000Z',
        [ALERT_START]: '2024-01-01T01:15:00.000Z',
        [ALERT_STATUS]: 'active',
        [ALERT_RULE_UUID]: 'rule-2',
        [ALERT_WORKFLOW_STATUS]: 'acknowledged',
      },
      // starts exactly on a bucket boundary
      {
        [TIMESTAMP]: '2024-01-01T02:10:00.000Z',
        [ALERT_START]: '2024-01-01T02:00:00.000Z',
        [ALERT_END]: '2024-01-01T02:10:00.000Z',
        [ALERT_STATUS]: 'untracked',
        [ALERT_RULE_UUID]: 'rule-2',
        [ALERT_WORKFLOW_STATUS]: 'acknowledged',
      },
      // started before the histogram range
      {
        [TIMESTAMP]: '2024-01-01T03:00:00.000Z',
        [ALERT_START]: '2023-12-31T23:00:00.000Z',
        [ALERT_STATUS]: 'active',
        [ALERT_RULE_UUID]: 'rule-3',
      },
      // delayed alerts are excluded by the base query
      {
        [TIMESTAMP]: '2024-01-01T01:00:00.000Z',
        [ALERT_START]: '2024-01-01T00:00:00.000Z',
        [ALERT_STATUS]: 'delayed',
        [ALERT_RULE_UUID]: 'rule-4',
      },
    ];

    /** Maps a classic alert to the row shape `computeOverlapCounts` takes, used as the expected-value oracle. */
    const toHistogramRow = (
      alert: Record<string, string | undefined>,
      breakdownField?: string
    ): HistogramEpisodeRow => {
      const timestamp = alert[TIMESTAMP] ?? '';
      const row: HistogramEpisodeRow = {
        first_timestamp: alert[ALERT_START] ?? timestamp,
        last_timestamp: alert[ALERT_END] ?? timestamp,
        'episode.status': mapClassicStatusToEpisodeStatus(alert[ALERT_STATUS]),
      };
      const breakdownValues: Record<string, unknown> = {
        'episode.status': row['episode.status'],
        'rule.id': alert[ALERT_RULE_UUID],
        last_ack_action: alert[ALERT_WORKFLOW_STATUS] === 'acknowledged' ? 'ack' : 'unack',
      };
      if (breakdownField) {
        row[breakdownField] = breakdownValues[breakdownField] ?? null;
      }
      return row;
    };

    const byBucketAndBreakdown = (a: HistogramBucketCount, b: HistogramBucketCount) =>
      a.bucketStart - b.bucketStart || (a.breakdown ?? '').localeCompare(b.breakdown ?? '');

    const expectedCounts = (breakdownField?: string) =>
      mergeBucketCounts(
        computeOverlapCounts(
          alerts
            .filter((alert) => alert[ALERT_STATUS] !== 'delayed')
            .map((alert) => toHistogramRow(alert, breakdownField)),
          buckets,
          breakdownField,
          NOW
        ).filter(({ count }) => count > 0)
      ).sort(byBucketAndBreakdown);

    const http = httpServiceMock.createStartContract();

    beforeAll(async () => {
      await esClient.indices.create({
        index: HISTOGRAM_INDEX,
        mappings: {
          properties: {
            [TIMESTAMP]: { type: 'date' },
            [ALERT_START]: { type: 'date' },
            [ALERT_END]: { type: 'date' },
            [ALERT_STATUS]: { type: 'keyword' },
            [ALERT_RULE_UUID]: { type: 'keyword' },
            [ALERT_WORKFLOW_STATUS]: { type: 'keyword' },
          },
        },
      });
      await esClient.bulk({
        index: HISTOGRAM_INDEX,
        refresh: 'wait_for',
        operations: alerts.flatMap((doc) => [{ index: {} }, doc]),
      });

      // Route the RAC find request straight to Elasticsearch so the real aggregations run.
      http.post.mockImplementation((async (_path: string, options: { body: string }) => {
        const {
          query,
          aggs,
          size,
          _source,
          track_total_hits: trackTotalHits,
        } = JSON.parse(options.body);
        return esClient.search({
          index: HISTOGRAM_INDEX,
          query,
          aggs,
          size,
          _source,
          track_total_hits: trackTotalHits,
        });
      }) as never);
    });

    const fetchCounts = async (breakdownField?: string) => {
      const { counts } = await fetchClassicAlertsHistogram({
        ruleTypeIds: ['.es-query'],
        services: { http },
        buckets,
        nowMs: NOW,
        breakdownField,
      });
      return mergeBucketCounts(counts.filter(({ count }) => count > 0)).sort(byBucketAndBreakdown);
    };

    it('matches client-side overlap counting without a breakdown', async () => {
      const counts = await fetchCounts();

      expect(counts).toEqual(expectedCounts());
      expect(counts.map(({ count }) => count)).toEqual([3, 3, 4, 2]);
    });

    it.each(['episode.status', 'rule.id', 'last_ack_action', 'last_assignee_uid'])(
      'matches client-side overlap counting with the %s breakdown',
      async (breakdownField) => {
        expect(await fetchCounts(breakdownField)).toEqual(expectedCounts(breakdownField));
      }
    );
  });
});
