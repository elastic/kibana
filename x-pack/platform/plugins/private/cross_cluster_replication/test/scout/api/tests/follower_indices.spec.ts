/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { FOLLOWER_INDEX_ADVANCED_SETTINGS } from '../../../../common/constants';
import { apiTest, testData, registerSelfReferentialRemote, removeRemote } from '../fixtures';

const { API_BASE_PATH, FOLLOWER_REMOTE_CLUSTER, COMMON_HEADERS } = testData;

// All test indices share these prefixes so cleanup can sweep by wildcard,
// covering leftovers from a run that crashed before its `afterEach`.
const LEADER_INDEX_PREFIX = 'leader-';
const FOLLOWER_INDEX_PREFIX = 'follower-';

// Runs stateful classic only: the self-referential `localhost` remote is not
// reachable on Cloud, so CCR API tests can't run there (the FTR was `skipCloud`).

// Best-effort teardown: a follower must be paused, closed, and unfollowed
// (converting it back to a regular index) before it — and its leader — can be
// deleted. Sweeps by wildcard so it also clears leftovers from a crashed run.
const cleanupFollowerResources = async (esClient: EsClient): Promise<void> => {
  // Read (not delete) may use wildcards; ES blocks wildcard deletes via
  // `action.destructive_requires_name`, so we resolve names and delete explicitly.
  const listByPrefix = async (prefix: string) =>
    Object.keys(
      await esClient.indices.get({
        index: `${prefix}*`,
        allow_no_indices: true,
        ignore_unavailable: true,
      })
    );

  const followerNames = await listByPrefix(FOLLOWER_INDEX_PREFIX);
  for (const name of followerNames) {
    try {
      await esClient.ccr.pauseFollow({ index: name });
      await esClient.indices.close({ index: name });
      await esClient.ccr.unfollow({ index: name });
    } catch {
      // Not a follower (already converted) or already gone — safe to skip.
    }
  }

  // Followers survive `unfollow` as regular indices, so delete them by name too.
  const toDelete = [...followerNames, ...(await listByPrefix(LEADER_INDEX_PREFIX))];
  if (toDelete.length) {
    await esClient.indices.delete({ index: toDelete }, { ignore: [404] });
  }
};

apiTest.describe('CCR follower indices API', { tag: tags.stateful.classic }, () => {
  let credentials: RoleApiCredentials;

  const authHeaders = () => ({ ...COMMON_HEADERS, ...credentials.apiKeyHeader });

  const createLeaderIndex = async (esClient: EsClient, suffix: string) => {
    const name = `${LEADER_INDEX_PREFIX}${suffix}`;
    await esClient.indices.create({ index: name });
    return name;
  };

  const createFollowerIndex = (
    apiClient: ApiClientFixture,
    suffix: string,
    payload: Record<string, unknown>
  ) =>
    apiClient.post(`${API_BASE_PATH}/follower_indices`, {
      headers: authHeaders(),
      responseType: 'json',
      body: JSON.stringify({ ...payload, name: `${FOLLOWER_INDEX_PREFIX}${suffix}` }),
    });

  const getFollowerIndex = (apiClient: ApiClientFixture, suffix: string) =>
    apiClient.get(`${API_BASE_PATH}/follower_indices/${FOLLOWER_INDEX_PREFIX}${suffix}`, {
      headers: authHeaders(),
      responseType: 'json',
    });

  // Poll until the follower reports `active`; ES can briefly return `paused`
  // right after creation, during which advanced settings aren't reported.
  const waitForFollowerActive = async (apiClient: ApiClientFixture, suffix: string) => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const response = await getFollowerIndex(apiClient, suffix);
      if (response.body.status === 'active') {
        return response.body;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Follower index '${suffix}' did not become active within the timeout`);
  };

  apiTest.beforeAll(async ({ requestAuth }) => {
    credentials = await requestAuth.getApiKey('admin');
  });

  apiTest.beforeEach(async ({ esClient }) => {
    await cleanupFollowerResources(esClient);
    await registerSelfReferentialRemote(esClient, FOLLOWER_REMOTE_CLUSTER);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await cleanupFollowerResources(esClient);
    await removeRemote(esClient, FOLLOWER_REMOTE_CLUSTER);
  });

  apiTest('returns an empty array when there are no follower indices', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/follower_indices`, {
      headers: authHeaders(),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ indices: [] });
  });

  apiTest('rejects following an index on an unknown remote cluster', async ({ apiClient }) => {
    const response = await createFollowerIndex(apiClient, 'unknown-cluster', {
      remoteCluster: 'unknown-cluster',
      leaderIndex: 'leader-does-not-matter',
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.attributes.error.reason).toContain('no such remote cluster');
  });

  apiTest('rejects following an unknown leader index', async ({ apiClient }) => {
    const response = await createFollowerIndex(apiClient, 'unknown-index', {
      remoteCluster: FOLLOWER_REMOTE_CLUSTER,
      leaderIndex: 'leader-does-not-exist',
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.attributes.error.reason).toContain('no such index');
  });

  apiTest(
    'creates a follower for an existing leader and reads it back',
    async ({ apiClient, esClient }) => {
      const leaderIndex = await createLeaderIndex(esClient, 'create-read');

      const createResponse = await createFollowerIndex(apiClient, 'create-read', {
        remoteCluster: FOLLOWER_REMOTE_CLUSTER,
        leaderIndex,
      });

      expect(createResponse).toHaveStatusCode(200);
      // ES can respond without acknowledging shard follow; only assert the follow
      // was created to avoid the `follow_index_shards_acked` race.
      expect(createResponse.body.follow_index_created).toBe(true);

      const getResponse = await getFollowerIndex(apiClient, 'create-read');
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.leaderIndex).toBe(leaderIndex);
      expect(getResponse.body.remoteCluster).toBe(FOLLOWER_REMOTE_CLUSTER);
    }
  );

  apiTest('returns a 404 when the follower index does not exist', async ({ apiClient }) => {
    const response = await getFollowerIndex(apiClient, 'missing');

    expect(response).toHaveStatusCode(404);
    expect(response.body.attributes.error.reason).toContain('no such index');
  });

  apiTest("updates a follower index's advanced settings", async ({ apiClient, esClient }) => {
    const leaderIndex = await createLeaderIndex(esClient, 'update');
    const initialValue = 1234;
    const updatedValue = 7777;

    await createFollowerIndex(apiClient, 'update', {
      remoteCluster: FOLLOWER_REMOTE_CLUSTER,
      leaderIndex,
      maxReadRequestOperationCount: initialValue,
    });

    const initial = await waitForFollowerActive(apiClient, 'update');
    expect(initial.maxReadRequestOperationCount).toBe(initialValue);

    const updateResponse = await apiClient.put(
      `${API_BASE_PATH}/follower_indices/${FOLLOWER_INDEX_PREFIX}update`,
      {
        headers: authHeaders(),
        responseType: 'json',
        body: JSON.stringify({ maxReadRequestOperationCount: updatedValue }),
      }
    );
    expect(updateResponse).toHaveStatusCode(200);

    const updated = await waitForFollowerActive(apiClient, 'update');
    expect(updated.maxReadRequestOperationCount).toBe(updatedValue);
  });

  apiTest(
    'hard-coded advanced-settings defaults match Elasticsearch',
    async ({ apiClient, esClient }) => {
      // Create a follower without advanced settings so ES fills in its defaults,
      // then confirm they match the values hard-coded in the plugin client.
      const leaderIndex = await createLeaderIndex(esClient, 'defaults');

      await createFollowerIndex(apiClient, 'defaults', {
        remoteCluster: FOLLOWER_REMOTE_CLUSTER,
        leaderIndex,
      });

      const body = await waitForFollowerActive(apiClient, 'defaults');
      for (const [key, value] of Object.entries(FOLLOWER_INDEX_ADVANCED_SETTINGS)) {
        expect(body[key]).toStrictEqual(value);
      }
    }
  );
});
