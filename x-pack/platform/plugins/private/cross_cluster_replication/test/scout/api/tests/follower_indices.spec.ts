/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

// Separate TS project: import by package name (a relative path crosses the project boundary and
// makes tsc emit stray in-place `.d.ts`). `uniform_imports` wants relative here — override it.
// eslint-disable-next-line @kbn/imports/uniform_imports
import { FOLLOWER_INDEX_ADVANCED_SETTINGS } from '@kbn/cross-cluster-replication-plugin/common/constants';
import {
  apiTest,
  testData,
  registerSelfReferentialRemote,
  removeRemote,
  REMOTE_CONNECT_TIMEOUT_MS,
} from '../fixtures';

const { API_BASE_PATH, FOLLOWER_REMOTE_CLUSTER, COMMON_HEADERS } = testData;

// Non-overlapping prefixes so cleanup only sweeps this suite's indices on the
// shared cluster, and the follower sweep can't also match leaders.
const LEADER_INDEX_PREFIX = 'ccr-scout-leader-';
const FOLLOWER_INDEX_PREFIX = 'ccr-scout-follower-';

// Scout's default 60s leaves too little headroom over the remote connect ceiling.
const SETUP_HOOK_TIMEOUT_MS = REMOTE_CONNECT_TIMEOUT_MS + 60_000;

const FOLLOWER_ACTIVE_TIMEOUT_MS = 15_000;
const FOLLOWER_ACTIVE_POLL_INTERVAL_MS = 500;

// A follower must be paused, closed, and unfollowed (back to a regular index)
// before it — and its leader — can be deleted.
const cleanupFollowerResources = async (esClient: EsClient): Promise<void> => {
  // ES blocks wildcard deletes (`action.destructive_requires_name`), so resolve
  // names by wildcard read and delete them explicitly.
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

// Local only: the self-referential `localhost` remote isn't reachable on ECH.
apiTest.describe('CCR follower indices API', { tag: ['@local-stateful-classic'] }, () => {
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

  // Poll until `active`: ES briefly reports `paused` right after creation, during
  // which advanced settings aren't returned.
  const waitForFollowerActive = async (apiClient: ApiClientFixture, suffix: string) => {
    await expect
      .poll(async () => (await getFollowerIndex(apiClient, suffix)).body.status, {
        timeout: FOLLOWER_ACTIVE_TIMEOUT_MS,
        intervals: [FOLLOWER_ACTIVE_POLL_INTERVAL_MS],
        message: `Follower index '${suffix}' did not become active`,
      })
      .toBe('active');

    return (await getFollowerIndex(apiClient, suffix)).body;
  };

  apiTest.beforeAll(async ({ esClient, requestAuth }) => {
    apiTest.setTimeout(SETUP_HOOK_TIMEOUT_MS);
    credentials = await requestAuth.getApiKey('admin');
    await cleanupFollowerResources(esClient);
    await registerSelfReferentialRemote(esClient, FOLLOWER_REMOTE_CLUSTER);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await cleanupFollowerResources(esClient);
  });

  apiTest.afterAll(async ({ esClient }) => {
    await cleanupFollowerResources(esClient);
    await removeRemote(esClient, FOLLOWER_REMOTE_CLUSTER);
  });

  apiTest('returns an empty array when there are no follower indices', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/follower_indices`, {
      headers: authHeaders(),
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(
      response.body.indices.filter((i: { name: string }) =>
        i.name.startsWith(FOLLOWER_INDEX_PREFIX)
      )
    ).toStrictEqual([]);
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
      // Only assert `follow_index_created`; `follow_index_shards_acked` is racy.
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
      // No advanced settings on create, so ES fills in its defaults.
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
