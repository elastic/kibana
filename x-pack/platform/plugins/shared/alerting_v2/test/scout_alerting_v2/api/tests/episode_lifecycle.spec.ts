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

  type AlertEvent = Record<string, unknown> & { episode: Record<string, unknown> };

  const TOLERATE_MISSING_DATASTREAM = {
    allow_no_indices: true,
    ignore_unavailable: true,
  } as const;

  /**
   * Returns all director-processed events (type=alert with episode.status set)
   * for the given rule, sorted by @timestamp. Returns an empty array if the
   * `.rule-events` data stream hasn't been created yet.
   */
  const getAlertEvents = async (esClient: EsClient, ruleId: string): Promise<AlertEvent[]> => {
    await esClient.indices.refresh({
      index: testData.ALERT_EVENTS_DATA_STREAM,
      ...TOLERATE_MISSING_DATASTREAM,
    });
    const result = await esClient.search({
      index: testData.ALERT_EVENTS_DATA_STREAM,
      ...TOLERATE_MISSING_DATASTREAM,
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
    return result.hits.hits.map((hit) => hit._source as AlertEvent);
  };

  /**
   * Returns only the latest director-processed event per group_hash for a rule.
   * Returns an empty map if the `.rule-events` data stream hasn't been created
   * yet.
   */
  const getLatestEpisodeStates = async (
    esClient: EsClient,
    ruleId: string
  ): Promise<Map<string, AlertEvent>> => {
    await esClient.indices.refresh({
      index: testData.ALERT_EVENTS_DATA_STREAM,
      ...TOLERATE_MISSING_DATASTREAM,
    });
    const result = await esClient.search({
      index: testData.ALERT_EVENTS_DATA_STREAM,
      ...TOLERATE_MISSING_DATASTREAM,
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

    const stateMap = new Map<string, AlertEvent>();
    for (const hit of result.hits.hits) {
      const doc = hit._source as AlertEvent;
      stateMap.set(doc.group_hash as string, doc);
    }
    return stateMap;
  };

  const waitForAlertEvents = async (
    esClient: EsClient,
    ruleId: string,
    count: number
  ): Promise<AlertEvent[]> => {
    await expect
      .poll(() => getAlertEvents(esClient, ruleId).then((events) => events.length), {
        timeout: POLL_TIMEOUT_MS,
        intervals: [POLL_INTERVAL_MS],
      })
      .toBeGreaterThanOrEqual(count);
    return getAlertEvents(esClient, ruleId);
  };

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

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();
  });

  apiTest.afterAll(async ({ esClient, apiServices }) => {
    await apiServices.alertingV2.rules.cleanUp();
    await apiServices.alertingV2.ruleEvents.cleanUp();

    await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
  });

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

      const eventsAfterFirst = await apiTest.step(
        'first execution emits a "pending" episode',
        async () => {
          const events = await waitForAlertEvents(esClient, rule.id, 1);
          const firstEpisode = events[0].episode;
          expect(firstEpisode.status).toBe('pending');
          expect(firstEpisode.id).toBeDefined();
          return events;
        }
      );

      const episodeId = eventsAfterFirst[0].episode.id;

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

      await apiTest.step(
        'second execution transitions pending -> active on the same episode',
        async () => {
          const events = await waitForAlertEvents(esClient, rule.id, 2);
          const secondEpisode = events[1].episode;
          expect(secondEpisode.status).toBe('active');
          expect(secondEpisode.id).toBe(episodeId);
        }
      );
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

      const activeEpisode = await apiTest.step(
        'first execution goes directly to "active" (pending_count=0)',
        async () => {
          const events = await waitForAlertEvents(esClient, rule.id, 1);
          const episode = events[0].episode;
          expect(episode.status).toBe('active');
          return episode;
        }
      );

      await esClient.deleteByQuery({
        index: SOURCE_INDEX,
        query: { term: { 'host.name': 'host-recovery-1' } },
        refresh: true,
        wait_for_completion: true,
      });

      await apiTest.step(
        'recovery execution transitions active -> inactive (recovering_count=0)',
        async () => {
          const events = await waitForAlertEvents(esClient, rule.id, 2);
          const recovered = events[1].episode;
          expect(recovered.status).toBe('inactive');
          expect(recovered.id).toBe(activeEpisode.id);
        }
      );
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

    const expectStatusesEventually = (expected: string[]) =>
      expect
        .poll(
          async () => {
            const states = await getLatestEpisodeStates(esClient, rule.id);
            return Array.from(states.values())
              .map((doc) => doc.episode.status as string)
              .sort();
          },
          { timeout: POLL_TIMEOUT_MS, intervals: [POLL_INTERVAL_MS] }
        )
        .toStrictEqual([...expected].sort());

    await apiTest.step('both groups become active', async () => {
      await expectStatusesEventually(['active', 'active']);
    });

    await esClient.deleteByQuery({
      index: SOURCE_INDEX,
      query: { term: { 'host.name': 'host-multi-a' } },
      refresh: true,
      wait_for_completion: true,
    });

    await apiTest.step('host-a recovers while host-b stays active', async () => {
      await expectStatusesEventually(['inactive', 'active']);
    });
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

      await apiTest.step(
        'first execution stays pending (statusCount=1, nextCount=1 < 2)',
        async () => {
          const events = await waitForAlertEvents(esClient, rule.id, 1);
          expect(events[0].episode.status).toBe('pending');
        }
      );

      const events = await apiTest.step(
        'second execution transitions to active (statusCount=1, nextCount=2 >= 2)',
        async () => waitForAlertEvents(esClient, rule.id, 2)
      );

      expect(events[1].episode.status).toBe('active');

      // Both events should share the same episode ID
      const episodeIds = events.map((e) => e.episode.id);
      expect(new Set(episodeIds).size).toBe(1);
    }
  );
});
