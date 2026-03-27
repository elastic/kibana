/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import { apiTest, tags } from '@kbn/scout';
import { INTERNAL_API_HEADERS, RULE_API_PATH, ALERTING_EVENTS_INDEX } from '../fixtures';

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
 *   pending  --[breached]--> activef
 *   active   --[recovered]--> recovering
 *   recovering --[recovered]--> inactive
 */
apiTest.describe('Episode lifecycle for alert rules', { tag: tags.stateful.classic }, () => {
  const SOURCE_INDEX = 'test-alerting-v2-e2e-source';
  const SCHEDULE_INTERVAL = '5s';
  const LOOKBACK_WINDOW = '1m';
  const POLL_INTERVAL_MS = 1000;
  const POLL_TIMEOUT_MS = 45_000;

  const ruleIds: string[] = [];

  apiTest.beforeAll(async ({ esClient }) => {
    // Create the source data index that rules will query
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

  apiTest.afterAll(async ({ esClient, apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

    for (const ruleId of ruleIds) {
      await apiClient
        .delete(`${RULE_API_PATH}/${ruleId}`, {
          headers: { ...INTERNAL_API_HEADERS, ...apiKeyHeader },
        })
        .catch(() => {});
    }

    await esClient.indices.delete({ index: SOURCE_INDEX }, { ignore: [404] });
    await esClient
      .deleteByQuery(
        {
          index: ALERTING_EVENTS_INDEX,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      )
      .catch(() => {});
  });

  /**
   * Polls .rule-events until the expected number of director-processed events
   * (type=alert, episode.status IS NOT NULL) appear for the given rule.
   */
  async function waitForAlertEvents(
    esClient: EsClient,
    ruleId: string,
    expectedCount: number
  ): Promise<Array<Record<string, unknown>>> {
    const start = Date.now();

    while (Date.now() - start < POLL_TIMEOUT_MS) {
      await esClient.indices.refresh({ index: ALERTING_EVENTS_INDEX }).catch(() => {});

      const result = await esClient.search({
        index: ALERTING_EVENTS_INDEX,
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

      if (result.hits.hits.length >= expectedCount) {
        return result.hits.hits.map((hit) => hit._source as Record<string, unknown>);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(
      `Timed out after ${POLL_TIMEOUT_MS}ms waiting for ${expectedCount} alert events for rule ${ruleId}`
    );
  }

  /**
   * Returns only the latest director-processed event per group_hash for a rule.
   */
  async function getLatestEpisodeStates(
    esClient: EsClient,
    ruleId: string
  ): Promise<Map<string, Record<string, unknown>>> {
    await esClient.indices.refresh({ index: ALERTING_EVENTS_INDEX }).catch(() => {});

    const result = await esClient.search({
      index: ALERTING_EVENTS_INDEX,
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

  /**
   * Polls getLatestEpisodeStates until the expected statuses appear.
   * This avoids race conditions where event counts can be satisfied
   * by pre-condition executions before the state change takes effect.
   */
  async function waitForEpisodeStatuses(
    esClient: EsClient,
    ruleId: string,
    expectedStatuses: string[]
  ): Promise<Map<string, Record<string, unknown>>> {
    const start = Date.now();

    let pollCount = 0;

    while (Date.now() - start < POLL_TIMEOUT_MS) {
      pollCount++;
      const states = await getLatestEpisodeStates(esClient, ruleId);
      const statuses = Array.from(states.values()).map(
        (doc) => (doc.episode as Record<string, unknown>).status as string
      );

      // eslint-disable-next-line no-console
      console.log(
        `[waitForEpisodeStatuses] poll #${pollCount} | rule=${ruleId} | expected=[${expectedStatuses}] | actual=[${statuses}] | groups=${
          states.size
        } | entries=${JSON.stringify(
          Array.from(states.entries()).map(([hash, doc]) => ({
            group_hash: hash,
            type: doc.type,
            status: doc.status,
            episode: doc.episode,
          }))
        )}`
      );

      const sortedExpected = [...expectedStatuses].sort();
      const sortedActual = [...statuses].sort();
      const allFound =
        sortedExpected.length === sortedActual.length &&
        sortedExpected.every((s, i) => s === sortedActual[i]);
      if (allFound) {
        return states;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(
      `Timed out after ${POLL_TIMEOUT_MS}ms waiting for episode statuses [${expectedStatuses.join(
        ', '
      )}] for rule ${ruleId}`
    );
  }

  apiTest(
    'should transition through pending -> active when source data keeps breaching',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      // Index breaching data into the source index
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

      // Create an alert rule that queries the source index
      const createResponse = await apiClient.post(RULE_API_PATH, {
        headers: { ...INTERNAL_API_HEADERS, ...apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name: 'e2e-lifecycle-pending-active' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | STATS count = COUNT(*) BY host.name`,
              condition: 'WHERE count >= 1',
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: null,
        },
        responseType: 'json',
      });

      expect(createResponse.statusCode).toBe(200);
      const ruleId = createResponse.body.id;
      ruleIds.push(ruleId);

      // Wait for first execution: should produce a "pending" episode
      const eventsAfterFirst = await waitForAlertEvents(esClient, ruleId, 1);
      const firstEpisode = eventsAfterFirst[0].episode as Record<string, unknown>;
      expect(firstEpisode.status).toBe('pending');
      expect(firstEpisode.id).toBeDefined();

      const episodeId = firstEpisode.id;

      // Keep breaching data present and wait for second execution: pending -> active
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

      const eventsAfterSecond = await waitForAlertEvents(esClient, ruleId, 2);
      const secondEpisode = eventsAfterSecond[1].episode as Record<string, unknown>;
      expect(secondEpisode.status).toBe('active');
      // Same episode ID through the lifecycle
      expect(secondEpisode.id).toBe(episodeId);
    }
  );

  apiTest(
    'should transition active -> recovering -> inactive when source data stops breaching',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      // Index breaching data
      for (let i = 0; i < 3; i++) {
        await esClient.index({
          index: SOURCE_INDEX,
          document: {
            '@timestamp': new Date().toISOString(),
            'host.name': 'host-recovery-1',
            'http.response.status_code': 503,
            value: i,
          },
          refresh: true,
        });
      }

      // Create rule with pending_count=0 and recovering_count=0 (skip intermediate states)
      const createResponse = await apiClient.post(RULE_API_PATH, {
        headers: { ...INTERNAL_API_HEADERS, ...apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name: 'e2e-lifecycle-recovery' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-recovery-1" | STATS count = COUNT(*) BY host.name`,
              condition: 'WHERE count >= 1',
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: {
            pending_count: 0,
            recovering_count: 0,
          },
        },
        responseType: 'json',
      });

      expect(createResponse.statusCode).toBe(200);
      const ruleId = createResponse.body.id;
      ruleIds.push(ruleId);

      // Wait for first execution: should go directly to active (pending_count=0)
      const eventsAfterBreach = await waitForAlertEvents(esClient, ruleId, 1);
      const activeEpisode = eventsAfterBreach[0].episode as Record<string, unknown>;
      expect(activeEpisode.status).toBe('active');

      // Remove the breaching data so recovery triggers
      await esClient.deleteByQuery({
        index: SOURCE_INDEX,
        query: { term: { 'host.name': 'host-recovery-1' } },
        refresh: true,
        wait_for_completion: true,
      });

      // Wait for recovery: active -> inactive (recovering_count=0 skips recovering)
      const eventsAfterRecovery = await waitForAlertEvents(esClient, ruleId, 2);
      const recoveredEpisode = eventsAfterRecovery[1].episode as Record<string, unknown>;
      expect(recoveredEpisode.status).toBe('inactive');

      // Same episode ID throughout
      expect(recoveredEpisode.id).toBe(activeEpisode.id);
    }
  );

  apiTest(
    'should track multiple groups independently',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      // Index breaching data for two different hosts
      await esClient.index({
        index: SOURCE_INDEX,
        document: {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-multi-a',
          'http.response.status_code': 500,
          value: 1,
        },
        refresh: true,
      });
      await esClient.index({
        index: SOURCE_INDEX,
        document: {
          '@timestamp': new Date().toISOString(),
          'host.name': 'host-multi-b',
          'http.response.status_code': 500,
          value: 1,
        },
        refresh: true,
      });

      const createResponse = await apiClient.post(RULE_API_PATH, {
        headers: { ...INTERNAL_API_HEADERS, ...apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name: 'e2e-lifecycle-multi-group' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name IN ("host-multi-a", "host-multi-b") | STATS count = COUNT(*) BY host.name`,
              condition: 'WHERE count >= 1',
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: {
            pending_count: 0,
            recovering_count: 0,
          },
        },
        responseType: 'json',
      });

      expect(createResponse.statusCode).toBe(200);
      const ruleId = createResponse.body.id;
      ruleIds.push(ruleId);

      // Wait for both groups to become active
      await waitForEpisodeStatuses(esClient, ruleId, ['active', 'active']);

      // Remove data for host-multi-a only, host-multi-b stays
      await esClient.deleteByQuery({
        index: SOURCE_INDEX,
        query: { term: { 'host.name': 'host-multi-a' } },
        refresh: true,
        wait_for_completion: true,
      });

      // Poll until host-multi-a recovers to inactive while host-multi-b stays active
      const statesAfterPartialRecovery = await waitForEpisodeStatuses(esClient, ruleId, [
        'inactive',
        'active',
      ]);

      const latestStatuses = Array.from(statesAfterPartialRecovery.values()).map(
        (doc) => (doc.episode as Record<string, unknown>).status
      );

      // host-multi-a should be inactive (recovered), host-multi-b should still be active
      expect(latestStatuses).toContain('inactive');
      expect(latestStatuses).toContain('active');
    }
  );

  apiTest(
    'should use pending_count threshold before transitioning to active',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      // Index breaching data
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

      // Create rule with pending_count=2.
      // The threshold check is: nextCount = currentStatusCount + 1 >= pending_count.
      // So with pending_count=2:
      //   Exec 1: no previous → enters pending (statusCount=1)
      //   Exec 2: statusCount=1, nextCount=2 >= 2 → transitions to active
      const createResponse = await apiClient.post(RULE_API_PATH, {
        headers: { ...INTERNAL_API_HEADERS, ...apiKeyHeader },
        body: {
          kind: 'alert',
          metadata: { name: 'e2e-lifecycle-threshold' },
          time_field: '@timestamp',
          schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
          evaluation: {
            query: {
              base: `FROM ${SOURCE_INDEX} | WHERE host.name == "host-threshold-1" | STATS count = COUNT(*) BY host.name`,
              condition: 'WHERE count >= 1',
            },
          },
          recovery_policy: { type: 'no_breach' },
          grouping: { fields: ['host.name'] },
          state_transition: {
            pending_count: 2,
          },
        },
        responseType: 'json',
      });

      expect(createResponse.statusCode).toBe(200);
      const ruleId = createResponse.body.id;
      ruleIds.push(ruleId);

      // Wait for first execution: should be pending (statusCount=1, nextCount=1 < 2)
      const eventsAfterFirst = await waitForAlertEvents(esClient, ruleId, 1);
      expect((eventsAfterFirst[0].episode as Record<string, unknown>).status).toBe('pending');

      // Second execution: should now be active (statusCount=1, nextCount=2 >= 2)
      const eventsAfterSecond = await waitForAlertEvents(esClient, ruleId, 2);
      expect((eventsAfterSecond[1].episode as Record<string, unknown>).status).toBe('active');

      // Both events should share the same episode ID
      const episodeIds = eventsAfterSecond.map((e) => (e.episode as Record<string, unknown>).id);
      expect(new Set(episodeIds).size).toBe(1);
    }
  );
});
