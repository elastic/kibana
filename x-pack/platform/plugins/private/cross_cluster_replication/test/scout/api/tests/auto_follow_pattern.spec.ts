/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  apiTest,
  testData,
  registerSelfReferentialRemote,
  removeRemote,
  REMOTE_CONNECT_TIMEOUT_MS,
} from '../fixtures';

const { API_BASE_PATH, AUTO_FOLLOW_REMOTE_CLUSTER, COMMON_HEADERS } = testData;

// Scout's default 60s leaves too little headroom over the remote connect ceiling.
const SETUP_HOOK_TIMEOUT_MS = REMOTE_CONNECT_TIMEOUT_MS + 60_000;

// Prefixed so cleanup only removes this suite's patterns from the shared cluster.
const PATTERN_PREFIX = 'ccr-scout-api-pattern-';

// Does not overlap the follower spec's leaders, so this pattern can't auto-create
// a competing follower for another suite's data.
const LEADER_INDEX_PATTERNS = ['ccr-scout-auto-leader-*'];

const deleteScoutAutoFollowPatterns = async (esClient: EsClient) => {
  const { patterns } = await esClient.ccr.getAutoFollowPattern();
  for (const { name } of patterns) {
    if (name.startsWith(PATTERN_PREFIX)) {
      await esClient.ccr.deleteAutoFollowPattern({ name });
    }
  }
};

// Local only: the self-referential `localhost` remote isn't reachable on ECH.
apiTest.describe('CCR auto-follow patterns API', { tag: ['@local-stateful-classic'] }, () => {
  let credentials: RoleApiCredentials;

  apiTest.beforeAll(async ({ esClient, requestAuth }) => {
    apiTest.setTimeout(SETUP_HOOK_TIMEOUT_MS);
    credentials = await requestAuth.getApiKey('admin');
    await deleteScoutAutoFollowPatterns(esClient);
    await registerSelfReferentialRemote(esClient, AUTO_FOLLOW_REMOTE_CLUSTER);
  });

  apiTest.afterEach(async ({ esClient }) => {
    await deleteScoutAutoFollowPatterns(esClient);
  });

  apiTest.afterAll(async ({ esClient }) => {
    await deleteScoutAutoFollowPatterns(esClient);
    await removeRemote(esClient, AUTO_FOLLOW_REMOTE_CLUSTER);
  });

  apiTest('returns an empty list when there are no auto-follow patterns', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/auto_follow_patterns`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(200);
    expect(
      response.body.patterns.filter((p: { name: string }) => p.name.startsWith(PATTERN_PREFIX))
    ).toStrictEqual([]);
  });

  apiTest('rejects creating a pattern for an unknown remote cluster', async ({ apiClient }) => {
    const response = await apiClient.post(`${API_BASE_PATH}/auto_follow_patterns`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
      body: JSON.stringify({
        id: `${PATTERN_PREFIX}unknown-cluster`,
        remoteCluster: 'unknown-cluster',
        leaderIndexPatterns: LEADER_INDEX_PATTERNS,
        followIndexPattern: '{{leader_index}}_follower',
      }),
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.attributes.error.reason).toContain('no such remote cluster');
  });

  apiTest(
    'creates and reads an auto-follow pattern for a known remote cluster',
    async ({ apiClient }) => {
      const id = `${PATTERN_PREFIX}known-cluster`;

      const createResponse = await apiClient.post(`${API_BASE_PATH}/auto_follow_patterns`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
        body: JSON.stringify({
          id,
          remoteCluster: AUTO_FOLLOW_REMOTE_CLUSTER,
          leaderIndexPatterns: LEADER_INDEX_PATTERNS,
          followIndexPattern: '{{leader_index}}_follower',
        }),
      });

      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body.acknowledged).toBe(true);

      const getResponse = await apiClient.get(`${API_BASE_PATH}/auto_follow_patterns/${id}`, {
        headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
        responseType: 'json',
      });

      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body).toStrictEqual({
        name: id,
        remoteCluster: AUTO_FOLLOW_REMOTE_CLUSTER,
        active: true,
        leaderIndexPatterns: LEADER_INDEX_PATTERNS,
        followIndexPattern: '{{leader_index}}_follower',
      });
    }
  );

  apiTest('returns a 404 when the auto-follow pattern is not found', async ({ apiClient }) => {
    const response = await apiClient.get(`${API_BASE_PATH}/auto_follow_patterns/missing-pattern`, {
      headers: { ...COMMON_HEADERS, ...credentials.apiKeyHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.attributes.error.reason).toBeDefined();
  });
});
