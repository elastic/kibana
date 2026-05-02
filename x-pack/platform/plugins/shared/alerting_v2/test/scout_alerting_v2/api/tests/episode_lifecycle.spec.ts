/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { apiTest, buildCreateRuleData, testData } from '../fixtures';

/**
 * E2E episode lifecycle tests for alerting_v2 alert rules.
 *
 * These tests exercise the full pipeline:
 *   1. Create a source data index with appropriate mappings
 *   2. Index documents that match (or don't match) the rule's ES|QL condition
 *   3. Create an alert rule via the API that queries that index
 *   4. Wait for task manager to execute the rule
 *   5. Verify the episode state transitions in .rule-events
 *
 * Episode state machine (basic strategy):
 *   inactive --[breached]--> pending
 *   pending  --[breached]--> active
 *   active   --[recovered]--> recovering
 *   recovering --[recovered]--> inactive
 */
apiTest.describe('Episode lifecycle for alert rules', { tag: tags.stateful.classic }, () => {
  const SOURCE_INDEX = 'test-alerting-v2-e2e-source';
  const SCHEDULE_INTERVAL = '5s';
  const LOOKBACK_WINDOW = '1m';
  // Rule executions go through task manager + the director; first events can take
  // 30-40s on a freshly booted Kibana. Keep the budget slightly above that.
  const POLL_TIMEOUT_MS = 45_000;
  const POLL_INTERVAL_MS = 1000;

  apiTest.beforeAll(async ({ esClient }) => {
    await esClient.indices.create(
      {
        index: SOURCE_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
            'http.response.status_code': { type: 'integer' },
            value: { type: 'long' },
          },
        },
      },
      { ignore: [400] }
    );
  });

  apiTest.afterAll(async ({ esClient, apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();

    await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
  });

  /**
   * Returns all director-processed events (type=alert with episode.status set)
   * for the given rule, sorted by @timestamp.
   */
  async function getAlertEvents(
    esClient: EsClient,
    ruleId: string
  ): Promise<Array<Record<string, unknown>>> {
    await esClient.indices.refresh({ index: testData.ALERT_EVENTS_DATA_STREAM });
    const result = await esClient.search({
      index: testData.ALERT_EVENTS_DATA_STREAM,
      query: {
        bool: {
          filter: [
            { term: { 'rule.id': ruleId } },
            { term: { type: 'alert' } },
            { exists: { field: 'episode.status' } },
          ],
        },
      },
      sort: [{ '@timestamp': 'asc' }],
      size: 100,
    });
    return result.hits.hits.map((hit) => hit._source as Record<string, unknown>);
  }

  /**
   * Returns only the latest director-processed event per group_hash for a rule.
   */
  async function getLatestEpisodeStates(
    esClient: EsClient,
    ruleId: string
  ): Promise<Map<string, Record<string, unknown>>> {
    await esClient.indices.refresh({ index: testData.ALERT_EVENTS_DATA_STREAM });
    const result = await esClient.search({
      index: testData.ALERT_EVENTS_DATA_STREAM,
      query: {
        bool: {
          filter: [
            { term: { 'rule.id': ruleId } },
            { term: { type: 'alert' } },
            { exists: { field: 'episode.status' } },
          ],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
      size: 100,
      collapse: { field: 'group_hash' },
    });

    const stateMap = new Map<string, Record<string, unknown>>();
    for (const hit of result.hits.hits) {
      const doc = hit._source as Record<string, unknown>;
      stateMap.set(doc.group_hash as string, doc);
    }
    return stateMap;
  }

  apiTest(
    'should transition through pending -> active when source data keeps breaching',
    async ({ apiServices, esClient }) => {
      await esClient.index({
        index: SOURCE_INDEX,
        document: {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-lifecycle-1',
          'http.response.status_code': 500,
          value: 1,
        },
        refresh: true,
      });

      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'e2e-lifecycle-pending-active' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: null,
        })
      );

      // First execution: should produce a "pending" episode
      await expect
        .poll(() => getAlertEvents(esClient, rule.id).then((events) => events.length), {
          timeout: POLL_TIMEOUT_MS,
          intervals: [POLL_INTERVAL_MS],
        })
        .toBeGreaterThanOrEqual(1);

      const eventsAfterFirst = await getAlertEvents(esClient, rule.id);
      const firstEpisode = eventsAfterFirst[0].episode as Record<string, unknown>;
      expect(firstEpisode.status).toBe('pending');
      expect(firstEpisode.id).toBeDefined();

      const episodeId = firstEpisode.id;

      await esClient.index({
        index: SOURCE_INDEX,
        document: {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-lifecycle-1',
          'http.response.status_code': 500,
          value: 2,
        },
        refresh: true,
      });

      // Second execution: pending -> active
      await expect
        .poll(() => getAlertEvents(esClient, rule.id).then((events) => events.length), {
          timeout: POLL_TIMEOUT_MS,
          intervals: [POLL_INTERVAL_MS],
        })
        .toBeGreaterThanOrEqual(2);

      const eventsAfterSecond = await getAlertEvents(esClient, rule.id);
      const secondEpisode = eventsAfterSecond[1].episode as Record<string, unknown>;
      expect(secondEpisode.status).toBe('active');
      expect(secondEpisode.id).toBe(episodeId);
    }
  );

  apiTest(
    'should transition active -> recovering -> inactive when source data stops breaching',
    async ({ apiServices, esClient }) => {
      // Bulk-index the breaching docs to avoid sequential round-trips.
      const breachOperations = Array.from({ length: 3 }, (_value, i) => [
        { index: { _index: SOURCE_INDEX } },
        {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-recovery-1',
          'http.response.status_code': 503,
          value: i,
        },
      ]).flat();
      await esClient.bulk({ operations: breachOperations, refresh: 'wait_for' });

      // pending_count=0 + recovering_count=0 makes the state machine skip the
      // intermediate states so we can assert active <-> inactive directly.
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'e2e-lifecycle-recovery' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-recovery-1" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: { pending_count: 0, recovering_count: 0 },
        })
      );

      expect(rule).toMatchObject({ id: expect.stringContaining('') });

      // First execution: should go directly to active (pending_count=0)
      await expect
        .poll(() => getAlertEvents(esClient, rule.id).then((events) => events.length), {
          timeout: POLL_TIMEOUT_MS,
          intervals: [POLL_INTERVAL_MS],
        })
        .toBeGreaterThanOrEqual(1);

      const eventsAfterBreach = await getAlertEvents(esClient, rule.id);
      const activeEpisode = eventsAfterBreach[0].episode as Record<string, unknown>;
      expect(activeEpisode.status).toBe('active');

      await esClient.deleteByQuery({
        index: SOURCE_INDEX,
        query: { term: { 'host.name': 'host-recovery-1' } },
        refresh: true,
        wait_for_completion: true,
      });

      // Recovery: active -> inactive (recovering_count=0 skips recovering)
      await expect
        .poll(() => getAlertEvents(esClient, rule.id).then((events) => events.length), {
          timeout: POLL_TIMEOUT_MS,
          intervals: [POLL_INTERVAL_MS],
        })
        .toBeGreaterThanOrEqual(2);

      const eventsAfterRecovery = await getAlertEvents(esClient, rule.id);
      const recoveredEpisode = eventsAfterRecovery[1].episode as Record<string, unknown>;
      expect(recoveredEpisode.status).toBe('inactive');
      expect(recoveredEpisode.id).toBe(activeEpisode.id);
    }
  );

  apiTest('should track multiple groups independently', async ({ apiServices, esClient }) => {
    await esClient.bulk({
      operations: [
        { index: { _index: SOURCE_INDEX } },
        {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-multi-a',
          'http.response.status_code': 500,
          value: 1,
        },
        { index: { _index: SOURCE_INDEX } },
        {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-multi-b',
          'http.response.status_code': 500,
          value: 1,
        },
      ],
      refresh: 'wait_for',
    });

    const rule = await apiServices.alertingV2.rules.create(
      buildCreateRuleData({
        metadata: { name: 'e2e-lifecycle-multi-group' },
        time_field: '@timestamp',
        schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
        evaluation: {
          query: {
            base: `FROM ${SOURCE_INDEX} | WHERE host.name IN ("host-multi-a", "host-multi-b") | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
          },
        },
        recovery_policy: { type: 'no_breach' },
        grouping: { fields: ['host.name'] },
        state_transition: { pending_count: 0, recovering_count: 0 },
      })
    );

    expect(rule).toMatchObject({ id: expect.stringContaining('') });

    const expectStatusesEventually = (expected: string[]) =>
      expect
        .poll(
          async () => {
            const states = await getLatestEpisodeStates(esClient, rule.id);
            return Array.from(states.values())
              .map((doc) => (doc.episode as Record<string, unknown>).status as string)
              .sort();
          },
          { timeout: POLL_TIMEOUT_MS, intervals: [POLL_INTERVAL_MS] }
        )
        .toStrictEqual([...expected].sort());

    await expectStatusesEventually(['active', 'active']);

    await esClient.deleteByQuery({
      index: SOURCE_INDEX,
      query: { term: { 'host.name': 'host-multi-a' } },
      refresh: true,
      wait_for_completion: true,
    });

    await expectStatusesEventually(['inactive', 'active']);
  });

  apiTest(
    'should use pending_count threshold before transitioning to active',
    async ({ apiServices, esClient }) => {
      await esClient.index({
        index: SOURCE_INDEX,
        document: {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-threshold-1',
          'http.response.status_code': 500,
          value: 1,
        },
        refresh: true,
      });

      // pending_count=2: nextCount = currentStatusCount + 1 >= pending_count.
      //   Exec 1: no previous → enters pending (statusCount=1)
      //   Exec 2: statusCount=1, nextCount=2 >= 2 → transitions to active
      const rule = await apiServices.alertingV2.rules.create(
        buildCreateRuleData({
          metadata: { name: 'e2e-lifecycle-threshold' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-threshold-1" | STATS count = COUNT(*) BY host.name | WHERE count >= 1`,
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: { pending_count: 2 },
        })
      );

      expect(rule).toMatchObject({ id: expect.stringContaining('') });

      // First execution: pending (statusCount=1, nextCount=1 < 2)
      await expect
        .poll(() => getAlertEvents(esClient, rule.id).then((events) => events.length), {
          timeout: POLL_TIMEOUT_MS,
          intervals: [POLL_INTERVAL_MS],
        })
        .toBeGreaterThanOrEqual(1);

      const eventsAfterFirst = await getAlertEvents(esClient, rule.id);
      expect((eventsAfterFirst[0].episode as Record<string, unknown>).status).toBe('pending');

      // Second execution: active (statusCount=1, nextCount=2 >= 2)
      await expect
        .poll(() => getAlertEvents(esClient, rule.id).then((events) => events.length), {
          timeout: POLL_TIMEOUT_MS,
          intervals: [POLL_INTERVAL_MS],
        })
        .toBeGreaterThanOrEqual(2);

      const eventsAfterSecond = await getAlertEvents(esClient, rule.id);
      expect((eventsAfterSecond[1].episode as Record<string, unknown>).status).toBe('active');

      // Both events should share the same episode ID
      const episodeIds = eventsAfterSecond.map((e) => (e.episode as Record<string, unknown>).id);
      expect(new Set(episodeIds).size).toBe(1);
    }
  );
});
