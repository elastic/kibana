/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { Client } from '@elastic/elasticsearch';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { KibanaRole, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

const { API_HEADERS, CONTEXT_ENGINE_READ, SESSION_MEMORY_FORGET_PATH } = testData;

const SESSION_MEMORY_DATA_STREAM = '.context-engine-session-memory';
const KIBANA_ORIGIN_HEADERS = { 'x-elastic-product-origin': 'kibana' };

const RUN_ID = randomUUID().slice(0, 8);
const OTHER_SPACE_ID = `ce-memory-other-${RUN_ID}`;
const SESSION_ID = `scout-memory-session-${RUN_ID}`;
const TARGET_USER_ID = `scout-memory-other-user-${RUN_ID}`;
const SEED_ROLE_NAME = `ce-scout-memory-seed-${RUN_ID}`;
const SEED_USERNAME = `ce-scout-memory-seed-${RUN_ID}`;
const SEED_PASSWORD = `scout-seed-${randomUUID()}`;
const OWN_OTHER_SPACE_MEMORY_ID = `mem-own-other-${RUN_ID}`;
const OWN_DEFAULT_SPACE_MEMORY_ID = `mem-own-default-${RUN_ID}`;
const TARGET_OTHER_SPACE_MEMORY_ID = `mem-target-other-${RUN_ID}`;
const TARGET_DEFAULT_SPACE_MEMORY_ID = `mem-target-default-${RUN_ID}`;
const SEEDED_MEMORY_IDS = [
  OWN_OTHER_SPACE_MEMORY_ID,
  OWN_DEFAULT_SPACE_MEMORY_ID,
  TARGET_OTHER_SPACE_MEMORY_ID,
  TARGET_DEFAULT_SPACE_MEMORY_ID,
];

const spacePath = (spaceId: string, path: string) => `s/${spaceId}/${path}`;

const READ_ONLY_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [CONTEXT_ENGINE_READ],
};

const OTHER_SPACE_WRITE_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { contextEngine: ['all'] },
      spaces: [OTHER_SPACE_ID],
    },
  ],
};

const DEFAULT_SPACE_MANAGE_MEMORY_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { contextEngine: ['all', 'manage_memory'] },
      spaces: [DEFAULT_SPACE_ID],
    },
    {
      base: [],
      feature: { contextEngine: ['all'] },
      spaces: [OTHER_SPACE_ID],
    },
  ],
};

const OTHER_SPACE_MANAGE_MEMORY_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [
    {
      base: [],
      feature: { contextEngine: ['all', 'manage_memory'] },
      spaces: [OTHER_SPACE_ID],
    },
  ],
};

apiTest.describe(
  'context engine session memory _forget API',
  { tag: tags.stateful.classic },
  () => {
    let seedEsClient: Client;
    let readOnlyCredentials: RoleApiCredentials;
    let otherSpaceWriteCredentials: RoleApiCredentials;
    let defaultSpaceManageMemoryCredentials: RoleApiCredentials;
    let otherSpaceManageMemoryCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth, kbnClient, esClient, config }) => {
      await kbnClient.spaces.create({ id: OTHER_SPACE_ID, name: 'CE session memory other space' });

      await esClient.security.putRole({
        name: SEED_ROLE_NAME,
        refresh: 'wait_for',
        indices: [
          {
            names: [SESSION_MEMORY_DATA_STREAM],
            privileges: ['all'],
            allow_restricted_indices: true,
          },
        ],
      });
      await esClient.security.putUser({
        username: SEED_USERNAME,
        password: SEED_PASSWORD,
        roles: [SEED_ROLE_NAME],
        refresh: 'wait_for',
      });
      seedEsClient = new Client({
        node: config.hosts.elasticsearch,
        auth: { username: SEED_USERNAME, password: SEED_PASSWORD },
        headers: KIBANA_ORIGIN_HEADERS,
        tls: { rejectUnauthorized: false },
      });

      readOnlyCredentials = await requestAuth.getApiKeyForCustomRole(READ_ONLY_ROLE);
      otherSpaceWriteCredentials = await requestAuth.getApiKeyForCustomRole(OTHER_SPACE_WRITE_ROLE);
      defaultSpaceManageMemoryCredentials = await requestAuth.getApiKeyForCustomRole(
        DEFAULT_SPACE_MANAGE_MEMORY_ROLE
      );
      otherSpaceManageMemoryCredentials = await requestAuth.getApiKeyForCustomRole(
        OTHER_SPACE_MANAGE_MEMORY_ROLE
      );

      const { api_keys: apiKeys } = await esClient.security.getApiKey({
        id: otherSpaceWriteCredentials.apiKey.id,
        with_profile_uid: true,
      });
      const callerProfileUid = apiKeys[0]?.profile_uid;
      expect(callerProfileUid).toBeDefined();

      const seededTimestamp = '2026-11-08T09:00:00.000Z';
      const seedDocs = [
        { id: OWN_OTHER_SPACE_MEMORY_ID, space: OTHER_SPACE_ID, user_id: callerProfileUid },
        { id: OWN_DEFAULT_SPACE_MEMORY_ID, space: DEFAULT_SPACE_ID, user_id: callerProfileUid },
        { id: TARGET_OTHER_SPACE_MEMORY_ID, space: OTHER_SPACE_ID, user_id: TARGET_USER_ID },
        { id: TARGET_DEFAULT_SPACE_MEMORY_ID, space: DEFAULT_SPACE_ID, user_id: TARGET_USER_ID },
      ];
      const bulkResult = await seedEsClient.bulk({
        operations: seedDocs.flatMap((doc) => [
          { create: { _index: SESSION_MEMORY_DATA_STREAM } },
          { '@timestamp': seededTimestamp, session_id: SESSION_ID, ...doc },
        ]),
        refresh: true,
      });
      expect(bulkResult.errors).toBe(false);
    });

    apiTest.afterAll(async ({ kbnClient, esClient }) => {
      if (seedEsClient) {
        await seedEsClient.deleteByQuery(
          {
            index: SESSION_MEMORY_DATA_STREAM,
            query: { terms: { id: SEEDED_MEMORY_IDS } },
            refresh: true,
          },
          { ignore: [404] }
        );
        await seedEsClient.close();
      }
      await esClient.security.deleteUser({ username: SEED_USERNAME }, { ignore: [404] });
      await esClient.security.deleteRole({ name: SEED_ROLE_NAME }, { ignore: [404] });
      await kbnClient.spaces.delete(OTHER_SPACE_ID);
    });

    apiTest('enforces contextEngine:write per space', async ({ apiClient }) => {
      const body = { ids: [OWN_OTHER_SPACE_MEMORY_ID] };

      await apiTest.step('rejects a read-only caller in the non-default space', async () => {
        const response = await apiClient.post(
          spacePath(OTHER_SPACE_ID, SESSION_MEMORY_FORGET_PATH),
          {
            headers: { ...readOnlyCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
            body,
          }
        );

        expect(response).toHaveStatusCode(403);
      });

      await apiTest.step(
        'rejects a caller whose write privilege is scoped to another space',
        async () => {
          const response = await apiClient.post(SESSION_MEMORY_FORGET_PATH, {
            headers: { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
            body,
          });

          expect(response).toHaveStatusCode(403);
        }
      );
    });

    apiTest(
      'forgets only the caller memories in the request space without manage_memory',
      async ({ apiClient }) => {
        const headers = { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS };
        const path = spacePath(OTHER_SPACE_ID, SESSION_MEMORY_FORGET_PATH);

        await apiTest.step(
          'forgets a memory in the request space and hides one seeded in the default space',
          async () => {
            const response = await apiClient.post(path, {
              headers,
              responseType: 'json',
              body: { ids: [OWN_OTHER_SPACE_MEMORY_ID, OWN_DEFAULT_SPACE_MEMORY_ID] },
            });

            expect(response).toHaveStatusCode(200);
            expect(response.body).toStrictEqual({
              results: [
                { id: OWN_OTHER_SPACE_MEMORY_ID, outcome: 'forgotten' },
                { id: OWN_DEFAULT_SPACE_MEMORY_ID, outcome: 'not_found' },
              ],
            });
          }
        );

        await seedEsClient.indices.refresh({ index: SESSION_MEMORY_DATA_STREAM });

        await apiTest.step('reports already_forgotten on a second request', async () => {
          const response = await apiClient.post(path, {
            headers,
            responseType: 'json',
            body: { ids: [OWN_OTHER_SPACE_MEMORY_ID] },
          });

          expect(response).toHaveStatusCode(200);
          expect(response.body).toStrictEqual({
            results: [{ id: OWN_OTHER_SPACE_MEMORY_ID, outcome: 'already_forgotten' }],
          });
        });
      }
    );

    apiTest(
      'resolves contextEngine:manage_memory in the request space when targeting another user',
      async ({ apiClient }) => {
        const path = spacePath(OTHER_SPACE_ID, SESSION_MEMORY_FORGET_PATH);
        const otherUserBody = {
          user_id: TARGET_USER_ID,
          ids: [TARGET_OTHER_SPACE_MEMORY_ID, TARGET_DEFAULT_SPACE_MEMORY_ID],
        };

        await apiTest.step('rejects when manage_memory is missing', async () => {
          const response = await apiClient.post(path, {
            headers: { ...otherSpaceWriteCredentials.apiKeyHeader, ...API_HEADERS },
            responseType: 'json',
            body: otherUserBody,
          });

          expect(response).toHaveStatusCode(403);
          expect(response.body).toMatchObject({
            message: expect.stringContaining('contextEngine:manage_memory'),
          });
        });

        await apiTest.step(
          'rejects when manage_memory is only granted in the default space',
          async () => {
            const response = await apiClient.post(path, {
              headers: { ...defaultSpaceManageMemoryCredentials.apiKeyHeader, ...API_HEADERS },
              responseType: 'json',
              body: otherUserBody,
            });

            expect(response).toHaveStatusCode(403);
            expect(response.body).toMatchObject({
              message: expect.stringContaining('contextEngine:manage_memory'),
            });
          }
        );

        await apiTest.step(
          'forgets only the target user memory in the request space when manage_memory is granted',
          async () => {
            const response = await apiClient.post(path, {
              headers: { ...otherSpaceManageMemoryCredentials.apiKeyHeader, ...API_HEADERS },
              responseType: 'json',
              body: otherUserBody,
            });

            expect(response).toHaveStatusCode(200);
            expect(response.body).toStrictEqual({
              results: [
                { id: TARGET_OTHER_SPACE_MEMORY_ID, outcome: 'forgotten' },
                { id: TARGET_DEFAULT_SPACE_MEMORY_ID, outcome: 'not_found' },
              ],
            });
          }
        );
      }
    );
  }
);
