/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchRoleDescriptor } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  PUBLIC_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../../../common/fixtures/constants';
import { installAllEntityTypes, uninstallAllEntityTypes } from '../../../common/fixtures/helpers';
import {
  ENGINE_DESCRIPTOR_CREATE_PRIVILEGE,
  ENTITY_STORE_CLUSTER_PRIVILEGES,
  ENTITY_STORE_SOURCE_INDICES_PRIVILEGES,
  ENTITY_STORE_TARGET_INDICES_PRIVILEGES,
  getEntitiesAlias,
  ENTITY_LATEST,
  getLatestEntityIndexPattern,
} from '../../../../../common';
import { getUpdatesEntitiesDataStreamName } from '../../../../../server/domain/asset_manager/updates_data_stream';
import { getMetadataEntitiesDataStreamName } from '../../../../../server/domain/asset_manager/metadata_data_stream';

const TASK_API_KEY_NAME_PATTERN = 'TaskManager: entity_store:v2:*';
const RESTRICTED_SOURCE_INDEX_PREFIX = 'restricted-update-api-key-logs';

interface TaskApiKey {
  id: string;
  name?: string;
  username?: string;
}

interface TaskApiKeysEsClient {
  security: {
    getApiKey: (params: {
      name: string;
      active_only: boolean;
    }) => Promise<{ api_keys: TaskApiKey[] }>;
  };
}

// The privileges a user needs to install the Entity Store, and so to take over its tasks.
const INSTALLER_INDICES = [
  { names: ['logs-*'], privileges: ENTITY_STORE_SOURCE_INDICES_PRIVILEGES },
  {
    names: [
      getEntitiesAlias(ENTITY_LATEST, 'default'),
      getLatestEntityIndexPattern('default'),
      getUpdatesEntitiesDataStreamName('default'),
      getMetadataEntitiesDataStreamName('default'),
    ],
    privileges: [
      ...new Set([
        ...ENTITY_STORE_TARGET_INDICES_PRIVILEGES,
        ...ENTITY_STORE_SOURCE_INDICES_PRIVILEGES,
      ]),
    ],
  },
];

const INSTALLER_ROLE = {
  elasticsearch: { cluster: ENTITY_STORE_CLUSTER_PRIVILEGES, indices: INSTALLER_INDICES },
  kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
};

const INSTALLER_ROLE_DESCRIPTOR: ElasticsearchRoleDescriptor = {
  cluster: ENTITY_STORE_CLUSTER_PRIVILEGES,
  indices: INSTALLER_INDICES,
  applications: [
    {
      application: 'kibana-.kibana',
      privileges: ['feature_siemV5.all', ENGINE_DESCRIPTOR_CREATE_PRIVILEGE],
      resources: ['*'],
    },
  ],
};

// The key name is TaskManager: <taskType> - <username>
const taskNameOf = ({ name = '' }: TaskApiKey) => name.slice(0, name.lastIndexOf(' - '));

apiTest.describe('Entity Store update API key API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let adminHeaders: Record<string, string>;
  let indicesToCleanup: string[] = [];

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
  });

  apiTest.afterEach(async ({ apiClient, esClient }) => {
    await uninstallAllEntityTypes(apiClient, adminHeaders);
    await Promise.allSettled(
      indicesToCleanup.map((index) => esClient.indices.delete({ index, ignore_unavailable: true }))
    );
    indicesToCleanup = [];
  });

  const getActiveTaskApiKeys = async (esClient: TaskApiKeysEsClient) => {
    const { api_keys: apiKeys } = await esClient.security.getApiKey({
      name: TASK_API_KEY_NAME_PATTERN,
      active_only: true,
    });
    return apiKeys;
  };

  // Task removal only queues a key for invalidation (after an hour by default), so keys left by an
  // earlier run or test can still be active. Tests record the keys that exist before they install
  // and ignore them afterwards, so they only look at the keys of their own installation.
  const getTaskApiKeysCreatedSince = async (
    esClient: TaskApiKeysEsClient,
    knownIds: ReadonlySet<string>
  ) => (await getActiveTaskApiKeys(esClient)).filter(({ id }) => !knownIds.has(id));

  const installAndGetTaskApiKeys = async (
    apiClient: Parameters<typeof installAllEntityTypes>[0],
    esClient: TaskApiKeysEsClient
  ) => {
    const staleIds = new Set((await getActiveTaskApiKeys(esClient)).map(({ id }) => id));
    await installAllEntityTypes(apiClient, adminHeaders);
    const keysBefore = await getTaskApiKeysCreatedSince(esClient, staleIds);
    expect(keysBefore.length).toBeGreaterThan(0);
    const knownIds = new Set([...staleIds, ...keysBefore.map(({ id }) => id)]);
    return { keysBefore, knownIds };
  };

  apiTest(
    'Should move the task API keys to the user making the request',
    async ({ apiClient, esClient, samlAuth }) => {
      const { keysBefore, knownIds } = await installAndGetTaskApiKeys(apiClient, esClient);
      const installerUsernames = new Set(keysBefore.map(({ username }) => username));
      expect(installerUsernames.size).toBe(1);

      // A different user with the privileges install needs.
      const { cookieHeader } = await samlAuth.asInteractiveUser(INSTALLER_ROLE);

      const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UPDATE_API_KEY, {
        headers: { ...cookieHeader, ...PUBLIC_HEADERS },
        responseType: 'json',
        body: {},
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.failed).toStrictEqual([]);
      expect(response.body.updated).toStrictEqual(
        expect.arrayContaining([
          'entity_store:v2:history_snapshot_task:default',
          'entity_store:v2:status_report_task:default',
          'entity_store:v2:resilience_task:default',
        ])
      );

      // The previous keys are invalidated asynchronously by Task Manager, so only check the new ones.
      const newKeys = await getTaskApiKeysCreatedSince(esClient, knownIds);
      expect(newKeys.length).toBeGreaterThan(0);
      newKeys.forEach(({ username }) => expect(installerUsernames.has(username)).toBe(false));

      // Compare the set of tasks, not the number of keys: a task that is running while it is
      // re-keyed can have its update retried, and Task Manager then grants a second key and queues
      // the first one for invalidation. Both stay active until the invalidation task runs, so one
      // task can briefly show up with two new keys.
      const rekeyedTasks = [...new Set(newKeys.map(taskNameOf))].sort();
      // Every task that had a key before has a new one, and nothing else got one.
      expect(rekeyedTasks).toStrictEqual([...new Set(keysBefore.map(taskNameOf))].sort());

      // The endpoint reports one entry per task that was re-keyed.
      expect(rekeyedTasks).toHaveLength(response.body.updated.length);
    }
  );

  apiTest(
    'Should give the tasks their own keys when the caller authenticates with an API key',
    { tag: tags.stateful.classic },
    async ({ apiClient, esClient, requestAuth }) => {
      const { keysBefore, knownIds } = await installAndGetTaskApiKeys(apiClient, esClient);
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(INSTALLER_ROLE_DESCRIPTOR);

      const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UPDATE_API_KEY, {
        headers: { ...PUBLIC_HEADERS, ...apiKeyHeader },
        responseType: 'json',
        body: {},
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.failed).toStrictEqual([]);

      const newKeys = await getTaskApiKeysCreatedSince(esClient, knownIds);
      expect([...new Set(newKeys.map(taskNameOf))].sort()).toStrictEqual(
        [...new Set(keysBefore.map(taskNameOf))].sort()
      );
    }
  );

  apiTest(
    'Should not change anything when the user lacks the privileges to install',
    async ({ apiClient, esClient, samlAuth }) => {
      const { knownIds } = await installAndGetTaskApiKeys(apiClient, esClient);

      const { cookieHeader } = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: [] },
        kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['default'] }],
      });

      const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UPDATE_API_KEY, {
        headers: { ...cookieHeader, ...PUBLIC_HEADERS },
        responseType: 'json',
        body: {},
      });

      expect(response).toHaveStatusCode(403);
      expect(await getTaskApiKeysCreatedSince(esClient, knownIds)).toStrictEqual([]);
    }
  );

  apiTest(
    'Should not change anything when the user cannot read the extra sources the store extracts from',
    async ({ apiClient, esClient, samlAuth }) => {
      const restrictedSourceIndex = `${RESTRICTED_SOURCE_INDEX_PREFIX}-${Date.now()}`;
      await esClient.indices.create({ index: restrictedSourceIndex });
      indicesToCleanup = [restrictedSourceIndex];

      const staleIds = new Set((await getActiveTaskApiKeys(esClient)).map(({ id }) => id));
      const installResponse = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: adminHeaders,
        responseType: 'json',
        body: { logExtraction: { additionalIndexPatterns: [restrictedSourceIndex] } },
      });
      expect(installResponse).toHaveStatusCode(201);
      const keysBefore = await getTaskApiKeysCreatedSince(esClient, staleIds);
      expect(keysBefore.length).toBeGreaterThan(0);

      // Can install the store, but has no access to the extra source it was configured with.
      const { cookieHeader } = await samlAuth.asInteractiveUser(INSTALLER_ROLE);

      const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UPDATE_API_KEY, {
        headers: { ...cookieHeader, ...PUBLIC_HEADERS },
        responseType: 'json',
        body: {},
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.attributes).toMatchObject({
        missing_elasticsearch_privileges: {
          cluster: [],
          index: [
            { index: restrictedSourceIndex, privileges: ENTITY_STORE_SOURCE_INDICES_PRIVILEGES },
          ],
        },
      });

      const knownIds = new Set([...staleIds, ...keysBefore.map(({ id }) => id)]);
      expect(await getTaskApiKeysCreatedSince(esClient, knownIds)).toStrictEqual([]);
    }
  );

  apiTest('Should do nothing when the Entity Store is not installed', async ({ apiClient }) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UPDATE_API_KEY, {
      headers: adminHeaders,
      responseType: 'json',
      body: {},
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({ ok: true, updated: [], failed: [] });
  });
});
