/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  PUBLIC_HEADERS,
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../../../common/fixtures/constants';
import { waitForStoreNotInstalled } from '../../../common/fixtures/helpers';

type ApiWorkerFixtures = Parameters<Parameters<typeof apiTest>[2]>[0];

const HISTORY_SNAPSHOT_TASK_ID = 'entity_store:v2:history_snapshot_task:default';

// Minimal Kibana privilege sufficient to call the enable/disable history snapshot routes.
// The routes declare DEFAULT_ENTITY_STORE_PERMISSIONS = { requiredPrivileges: ['securitySolution'] }.
const HISTORY_SNAPSHOT_OPERATOR_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { siemV5: ['all'] }, spaces: ['*'] }],
};

// No Security Solution access — must be rejected with 403 on both routes.
const NO_SECURITY_SOLUTION_ROLE: KibanaRole = {
  elasticsearch: { cluster: [], indices: [] },
  kibana: [{ base: [], feature: { discover: ['all'] }, spaces: ['*'] }],
};

apiTest.describe('Entity Store history snapshot enable/disable', { tag: ENTITY_STORE_TAGS }, () => {
  // Admin cookie: setup/cleanup (install, uninstall) and the internal force route only.
  let adminHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;
  // Minimal API key: public enable/disable endpoints.
  let operatorApiKeyHeader: Record<string, string>;
  // Under-privileged API key: must be rejected with 403.
  let unprivilegedApiKeyHeader: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, requestAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    adminHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
    internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

    const { apiKeyHeader: operatorKey } = await requestAuth.getApiKeyForCustomRole(
      HISTORY_SNAPSHOT_OPERATOR_ROLE
    );
    operatorApiKeyHeader = { ...operatorKey, ...PUBLIC_HEADERS };

    const { apiKeyHeader: unprivilegedKey } = await requestAuth.getApiKeyForCustomRole(
      NO_SECURITY_SOLUTION_ROLE
    );
    unprivilegedApiKeyHeader = { ...unprivilegedKey, ...PUBLIC_HEADERS };
  });

  const install = async (apiClient: ApiWorkerFixtures['apiClient']) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: adminHeaders,
      responseType: 'json',
      body: { historySnapshot: { frequency: '24h' } },
    });
    expect(response.statusCode).toBe(201);
  };

  const uninstall = async (apiClient: ApiWorkerFixtures['apiClient']) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: adminHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
    // Wait for N consecutive not_installed responses so that all nodes have converged
    // before the next test starts — a single response is not sufficient on multi-node clusters.
    await waitForStoreNotInstalled(apiClient, adminHeaders);
  };

  const getHistorySnapshotTask = async (kbnClient: ApiWorkerFixtures['kbnClient']) =>
    kbnClient.savedObjects.get({ type: 'task', id: HISTORY_SNAPSHOT_TASK_ID });

  const getGlobalState = async (kbnClient: ApiWorkerFixtures['kbnClient']) =>
    kbnClient.savedObjects.get({
      type: 'entity-store-global-state',
      id: 'entity-store-global-state-default',
    });

  apiTest.afterEach(async ({ apiClient }) => {
    await uninstall(apiClient);
  });

  apiTest(
    'returns 403 for callers without the securitySolution privilege on enable and disable',
    async ({ apiClient }) => {
      const enableResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.public.ENABLE_HISTORY_SNAPSHOT,
        { headers: unprivilegedApiKeyHeader, responseType: 'json', body: {} }
      );
      expect(enableResponse.statusCode).toBe(403);

      const disableResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.public.DISABLE_HISTORY_SNAPSHOT,
        { headers: unprivilegedApiKeyHeader, responseType: 'json', body: {} }
      );
      expect(disableResponse.statusCode).toBe(403);
    }
  );

  apiTest(
    'disables and enables the history snapshot task via Task Manager',
    async ({ apiClient, kbnClient }) => {
      await install(apiClient);

      const installedTask = await getHistorySnapshotTask(kbnClient);
      expect(installedTask.attributes?.enabled).toBe(true);

      const disableResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.public.DISABLE_HISTORY_SNAPSHOT,
        { headers: operatorApiKeyHeader, responseType: 'json', body: {} }
      );
      expect(disableResponse.statusCode).toBe(200);
      expect(disableResponse.body).toStrictEqual({ ok: true });

      const disabledTask = await getHistorySnapshotTask(kbnClient);
      expect(disabledTask.attributes?.enabled).toBe(false);

      const disabledGlobalState = await getGlobalState(kbnClient);
      expect(disabledGlobalState.attributes?.historySnapshot?.status).toBe('stopped');

      const enableResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.public.ENABLE_HISTORY_SNAPSHOT,
        { headers: operatorApiKeyHeader, responseType: 'json', body: {} }
      );
      expect(enableResponse.statusCode).toBe(200);
      expect(enableResponse.body).toStrictEqual({ ok: true });

      const enabledTask = await getHistorySnapshotTask(kbnClient);
      expect(enabledTask.attributes?.enabled).toBe(true);

      const enabledGlobalState = await getGlobalState(kbnClient);
      expect(enabledGlobalState.attributes?.historySnapshot?.status).toBe('started');
    }
  );

  apiTest(
    'returns 404 on enable and disable when the entity store is not installed',
    async ({ apiClient }) => {
      await uninstall(apiClient);

      const enableResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.public.ENABLE_HISTORY_SNAPSHOT,
        { headers: operatorApiKeyHeader, responseType: 'json', body: {} }
      );
      expect(enableResponse.statusCode).toBe(404);
      expect(enableResponse.body.error).toBe('Not Found');
      expect(enableResponse.body.message).toContain('not installed');

      const disableResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.public.DISABLE_HISTORY_SNAPSHOT,
        { headers: operatorApiKeyHeader, responseType: 'json', body: {} }
      );
      expect(disableResponse.statusCode).toBe(404);
      expect(disableResponse.body.error).toBe('Not Found');
      expect(disableResponse.body.message).toContain('not installed');
    }
  );

  apiTest(
    'disables with index cleanup then re-enables and runs an immediate snapshot',
    async ({ apiClient, kbnClient, esClient }) => {
      await install(apiClient);

      // Force an immediate snapshot to create at least one history index.
      // The internal force route requires an admin session — it is not exposed publicly.
      const forceResponse = await apiClient.post(
        ENTITY_STORE_ROUTES.internal.FORCE_HISTORY_SNAPSHOT,
        { headers: internalHeaders, responseType: 'json', body: {} }
      );
      expect(forceResponse.statusCode).toBe(200);

      const historyIndexPattern = '.entities.v2.history.default.*';
      const indicesBefore = await esClient.indices.resolveIndex({ name: historyIndexPattern });
      expect(indicesBefore.indices.length).toBeGreaterThan(0);

      const disableResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.public.DISABLE_HISTORY_SNAPSHOT,
        {
          headers: operatorApiKeyHeader,
          responseType: 'json',
          body: { clearHistorySnapshots: true },
        }
      );
      expect(disableResponse.statusCode).toBe(200);
      expect(disableResponse.body).toStrictEqual({ ok: true });

      const disabledTask = await getHistorySnapshotTask(kbnClient);
      expect(disabledTask.attributes?.enabled).toBe(false);

      const disabledGlobalState = await getGlobalState(kbnClient);
      expect(disabledGlobalState.attributes?.historySnapshot?.status).toBe('stopped');

      // Deletion fires in the background — poll until all prior indices are gone
      await expect
        .poll(
          async () => {
            const result = await esClient.indices.resolveIndex({
              name: historyIndexPattern,
              ignore_unavailable: true,
            });
            return result.indices.length;
          },
          { timeout: 30_000, intervals: [500] }
        )
        .toBe(0);

      // Re-enable: the public API promises an immediate run in addition to re-enabling the task.
      // Poll for a new history index to verify the run actually fired, not just that the task
      // flag was toggled — a Task Manager regression where runSoon silently fails would otherwise
      // pass the enable/status assertions above.
      const enableResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.public.ENABLE_HISTORY_SNAPSHOT,
        { headers: operatorApiKeyHeader, responseType: 'json', body: {} }
      );
      expect(enableResponse.statusCode).toBe(200);
      expect(enableResponse.body).toStrictEqual({ ok: true });

      const enabledGlobalState = await getGlobalState(kbnClient);
      expect(enabledGlobalState.attributes?.historySnapshot?.status).toBe('started');

      await expect
        .poll(
          async () => {
            const result = await esClient.indices.resolveIndex({
              name: historyIndexPattern,
              ignore_unavailable: true,
            });
            return result.indices.length;
          },
          { timeout: 60_000, intervals: [1_000] }
        )
        .toBeGreaterThan(0);
    }
  );
});
