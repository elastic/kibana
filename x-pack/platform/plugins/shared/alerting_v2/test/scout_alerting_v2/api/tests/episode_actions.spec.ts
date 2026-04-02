/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import { apiTest, tags } from '@kbn/scout';
import {
  API_HEADERS,
  RULE_API_PATH,
  ALERT_API_PATH,
  ALERTING_EVENTS_INDEX,
  ALERT_ACTIONS_INDEX,
} from '../fixtures';

const DISPATCHER_SYSTEM_ACTION_TYPES = ['fire', 'suppress', 'unmatched', 'notified'] as const;

apiTest.describe(
  'Episode actions for alert rules',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
  const SOURCE_INDEX = 'test-alerting-v2-e2e-actions';
  const SCHEDULE_INTERVAL = '5s';
  const LOOKBACK_WINDOW = '1m';
  const POLL_INTERVAL_MS = 1000;
  const POLL_TIMEOUT_MS = 60_000;

  const ruleIds: string[] = [];
  let groupHashes: string[] = [];
  let episodeIds: string[] = [];

  async function waitForEpisodeStatuses(
    esClient: EsClient,
    ruleId: string,
    expectedStatuses: string[]
  ): Promise<Map<string, Record<string, unknown>>> {
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
        sort: [{ '@timestamp': 'desc' }],
        size: 100,
        collapse: { field: 'group_hash' },
      });

      const stateMap = new Map<string, Record<string, unknown>>();
      for (const hit of result.hits.hits) {
        const doc = hit._source as Record<string, unknown>;
        stateMap.set(doc.group_hash as string, doc);
      }

      const statuses = Array.from(stateMap.values()).map(
        (doc) => (doc.episode as Record<string, unknown>).status as string
      );

      const sortedExpected = [...expectedStatuses].sort();
      const sortedActual = [...statuses].sort();
      if (
        sortedExpected.length === sortedActual.length &&
        sortedExpected.every((s, i) => s === sortedActual[i])
      ) {
        return stateMap;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(
      `Timed out waiting for episode statuses [${expectedStatuses.join(', ')}] for rule ${ruleId}`
    );
  }

  async function searchAlertActions(
    esClient: EsClient,
    groupHash: string,
    actionType: string
  ): Promise<Array<Record<string, unknown>>> {
    await esClient.indices.refresh({ index: ALERT_ACTIONS_INDEX }).catch(() => {});

    const result = await esClient.search({
      index: ALERT_ACTIONS_INDEX,
      query: {
        bool: {
          filter: [
            { term: { group_hash: groupHash } },
            { term: { action_type: actionType } },
          ],
          must_not: [
            {
              terms: {
                action_type: [...DISPATCHER_SYSTEM_ACTION_TYPES],
              },
            },
          ],
        },
      },
      sort: [{ '@timestamp': 'desc' }],
      size: 10,
    });

    return result.hits.hits.map((hit) => hit._source as Record<string, unknown>);
  }

  apiTest.beforeAll(async ({ esClient, apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

    await esClient.indices.create(
      {
        index: SOURCE_INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
            value: { type: 'long' },
          },
        },
      },
      { ignore: [400] }
    );

    for (const host of ['host-action-a', 'host-action-b']) {
      for (let i = 0; i < 3; i++) {
        await esClient.index({
          index: SOURCE_INDEX,
          document: {
            '@timestamp': new Date().toISOString(),
            'host.name': host,
            value: i + 1,
          },
          refresh: true,
        });
      }
    }

    const createResponse = await apiClient.post(RULE_API_PATH, {
      headers: { ...API_HEADERS, ...apiKeyHeader },
      body: {
        kind: 'alert',
        metadata: { name: 'e2e-episode-actions' },
        time_field: '@timestamp',
        schedule: { every: SCHEDULE_INTERVAL, lookback: LOOKBACK_WINDOW },
        evaluation: {
          query: {
            base: `FROM ${SOURCE_INDEX} | WHERE host.name IN ("host-action-a", "host-action-b") | STATS count = COUNT(*) BY host.name`,
            condition: 'WHERE count >= 1',
          },
        },
        recovery_policy: { type: 'no_breach' },
        grouping: { fields: ['host.name'] },
        state_transition: { pending_count: 0, recovering_count: 0 },
      },
      responseType: 'json',
    });

    expect(createResponse.statusCode).toBe(200);
    const ruleId = createResponse.body.id;
    ruleIds.push(ruleId);

    const stateMap = await waitForEpisodeStatuses(esClient, ruleId, ['active', 'active']);

    groupHashes = Array.from(stateMap.keys());
    episodeIds = Array.from(stateMap.values()).map(
      (doc) => (doc.episode as Record<string, unknown>).id as string
    );
  });

  apiTest.afterAll(async ({ esClient, apiClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

    for (const ruleId of ruleIds) {
      await apiClient
        .delete(`${RULE_API_PATH}/${ruleId}`, {
          headers: { ...API_HEADERS, ...apiKeyHeader },
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
    await esClient
      .deleteByQuery(
        {
          index: ALERT_ACTIONS_INDEX,
          query: { match_all: {} },
          refresh: true,
          wait_for_completion: true,
          conflicts: 'proceed',
        },
        { ignore: [404] }
      )
      .catch(() => {});
  });

  apiTest('should acknowledge an episode', async ({ apiClient, esClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const groupHash = groupHashes[0];

    const response = await apiClient.post(
      `${ALERT_API_PATH}/${groupHash}/action/_ack`,
      {
        headers: { ...API_HEADERS, ...apiKeyHeader },
        body: { episode_id: episodeIds[0] },
        responseType: 'text',
      }
    );

    expect(response.statusCode).toBe(204);

    const docs = await searchAlertActions(esClient, groupHash, 'ack');
    expect(docs.length >= 1).toBe(true);
    expect(docs[0].group_hash).toBe(groupHash);
    expect(docs[0].action_type).toBe('ack');
    expect(docs[0].episode_id).toBe(episodeIds[0]);
    expect(docs[0].actor).toBeDefined();
    expect(docs[0]['@timestamp']).toBeDefined();
    expect(docs[0].rule_id).toBeDefined();
  });

  apiTest('should unacknowledge an episode', async ({ apiClient, esClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const groupHash = groupHashes[0];

    const response = await apiClient.post(
      `${ALERT_API_PATH}/${groupHash}/action/_unack`,
      {
        headers: { ...API_HEADERS, ...apiKeyHeader },
        body: { episode_id: episodeIds[0] },
        responseType: 'text',
      }
    );

    expect(response.statusCode).toBe(204);

    const docs = await searchAlertActions(esClient, groupHash, 'unack');
    expect(docs.length >= 1).toBe(true);
    expect(docs[0].group_hash).toBe(groupHash);
    expect(docs[0].action_type).toBe('unack');
    expect(docs[0].episode_id).toBe(episodeIds[0]);
  });

  apiTest(
    'should snooze a group with expiry',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const groupHash = groupHashes[0];
      const expiry = new Date(Date.now() + 3_600_000).toISOString();

      const response = await apiClient.post(
        `${ALERT_API_PATH}/${groupHash}/action/_snooze`,
        {
          headers: { ...API_HEADERS, ...apiKeyHeader },
          body: { expiry },
          responseType: 'text',
        }
      );

      expect(response.statusCode).toBe(204);

      const docs = await searchAlertActions(esClient, groupHash, 'snooze');
      expect(docs.length >= 1).toBe(true);
      expect(docs[0].group_hash).toBe(groupHash);
      expect(docs[0].action_type).toBe('snooze');
      expect(docs[0].expiry).toBe(expiry);
    }
  );

  apiTest(
    'should snooze a group without expiry',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const groupHash = groupHashes[1];

      const response = await apiClient.post(
        `${ALERT_API_PATH}/${groupHash}/action/_snooze`,
        {
          headers: { ...API_HEADERS, ...apiKeyHeader },
          body: {},
          responseType: 'text',
        }
      );

      expect(response.statusCode).toBe(204);

      const docs = await searchAlertActions(esClient, groupHash, 'snooze');
      expect(docs.length >= 1).toBe(true);
      expect(docs[0].group_hash).toBe(groupHash);
      expect(docs[0].action_type).toBe('snooze');
    }
  );

  apiTest('should unsnooze a group', async ({ apiClient, esClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const groupHash = groupHashes[0];

    const response = await apiClient.post(
      `${ALERT_API_PATH}/${groupHash}/action/_unsnooze`,
      {
        headers: { ...API_HEADERS, ...apiKeyHeader },
        body: {},
        responseType: 'text',
      }
    );

    expect(response.statusCode).toBe(204);

    const docs = await searchAlertActions(esClient, groupHash, 'unsnooze');
    expect(docs.length >= 1).toBe(true);
    expect(docs[0].group_hash).toBe(groupHash);
    expect(docs[0].action_type).toBe('unsnooze');
  });

  apiTest(
    'should deactivate a group',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const groupHash = groupHashes[0];

      const response = await apiClient.post(
        `${ALERT_API_PATH}/${groupHash}/action/_deactivate`,
        {
          headers: { ...API_HEADERS, ...apiKeyHeader },
          body: { reason: 'Manual resolve from test' },
          responseType: 'text',
        }
      );

      expect(response.statusCode).toBe(204);

      const docs = await searchAlertActions(esClient, groupHash, 'deactivate');
      expect(docs.length >= 1).toBe(true);
      expect(docs[0].group_hash).toBe(groupHash);
      expect(docs[0].action_type).toBe('deactivate');
      expect(docs[0].reason).toBe('Manual resolve from test');
    }
  );

  apiTest(
    'should activate a group',
    async ({ apiClient, esClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const groupHash = groupHashes[0];

      const response = await apiClient.post(
        `${ALERT_API_PATH}/${groupHash}/action/_activate`,
        {
          headers: { ...API_HEADERS, ...apiKeyHeader },
          body: { reason: 'Manual unresolve from test' },
          responseType: 'text',
        }
      );

      expect(response.statusCode).toBe(204);

      const docs = await searchAlertActions(esClient, groupHash, 'activate');
      expect(docs.length >= 1).toBe(true);
      expect(docs[0].group_hash).toBe(groupHash);
      expect(docs[0].action_type).toBe('activate');
      expect(docs[0].reason).toBe('Manual unresolve from test');
    }
  );

  apiTest('should tag a group', async ({ apiClient, esClient, requestAuth }) => {
    const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
    const groupHash = groupHashes[1];

    const response = await apiClient.post(
      `${ALERT_API_PATH}/${groupHash}/action/_tag`,
      {
        headers: { ...API_HEADERS, ...apiKeyHeader },
        body: { tags: ['critical', 'network', 'production'] },
        responseType: 'text',
      }
    );

    expect(response.statusCode).toBe(204);

    const docs = await searchAlertActions(esClient, groupHash, 'tag');
    expect(docs.length >= 1).toBe(true);
    expect(docs[0].group_hash).toBe(groupHash);
    expect(docs[0].action_type).toBe('tag');
    expect(JSON.stringify(docs[0].tags)).toBe(JSON.stringify(['critical', 'network', 'production']));
  });

  apiTest(
    'should return error for unknown group_hash',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

      const response = await apiClient.post(
        `${ALERT_API_PATH}/nonexistent-group-hash/action/_ack`,
        {
          headers: { ...API_HEADERS, ...apiKeyHeader },
          body: { episode_id: 'nonexistent-episode' },
          responseType: 'json',
        }
      );

      expect(response.statusCode).toBe(404);
    }
  );

  apiTest(
    'should reject body with action_type field',
    async ({ apiClient, requestAuth }) => {
      const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();
      const groupHash = groupHashes[0];

      const response = await apiClient.post(
        `${ALERT_API_PATH}/${groupHash}/action/_snooze`,
        {
          headers: { ...API_HEADERS, ...apiKeyHeader },
          body: { action_type: 'snooze' },
          responseType: 'json',
        }
      );

      expect(response.statusCode).toBe(400);
    }
  );
  }
);
