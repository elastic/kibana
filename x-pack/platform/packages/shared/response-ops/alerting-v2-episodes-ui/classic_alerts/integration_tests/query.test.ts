/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { createTestEsCluster, type EsTestCluster } from '@kbn/test';
import { ALERT_SEVERITY, ALERT_STATUS, ALERT_RULE_UUID, TIMESTAMP } from '@kbn/rule-data-utils';
import { buildClassicAlertsQuery, buildClassicAlertsSort } from '../utils/query';

const TEST_INDEX = 'test-classic-alerts';

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
        sort: buildClassicAlertsSort({ sortField: 'severity', sortDirection: 'desc' }),
        _source: [ALERT_SEVERITY],
      });

      const severities = result.hits.hits.map(
        (hit) => (hit._source as Record<string, unknown>)?.[ALERT_SEVERITY] ?? null
      );
      expect(severities).toEqual([
        'critical',
        'high',
        'major',
        'medium',
        'warning',
        'low',
        'minor',
        'info',
        null,
      ]);
    });

    it('sorts by severity ascending (unknowns first, critical last)', async () => {
      const result = await esClient.search({
        index: TEST_INDEX,
        size: 20,
        query: { match_all: {} },
        sort: buildClassicAlertsSort({ sortField: 'severity', sortDirection: 'asc' }),
        _source: [ALERT_SEVERITY],
      });

      const severities = result.hits.hits.map(
        (hit) => (hit._source as Record<string, unknown>)?.[ALERT_SEVERITY] ?? null
      );
      expect(severities).toEqual([
        null,
        'info',
        'low',
        'minor',
        'medium',
        'warning',
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
});
