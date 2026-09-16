/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  PUBLIC_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../../../common/fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common';

type ApiWorkerFixtures = Parameters<Parameters<typeof apiTest>[2]>[0];

const HISTORY_SNAPSHOT_TASK_ID = 'entity_store:v2:history_snapshot_task:default';

apiTest.describe('Entity Store history snapshot enable/disable', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });
  });

  const install = async (apiClient: ApiWorkerFixtures['apiClient']) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { historySnapshot: { frequency: '24h' } },
    });
    expect(response.statusCode).toBe(201);
  };

  const uninstall = async (apiClient: ApiWorkerFixtures['apiClient']) => {
    const response = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(response.statusCode).toBe(200);
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
    'disables and enables the history snapshot task via Task Manager',
    async ({ apiClient, kbnClient }) => {
      await install(apiClient);

      const installedTask = await getHistorySnapshotTask(kbnClient);
      expect(installedTask.attributes?.enabled).toBe(true);

      const disableResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.public.DISABLE_HISTORY_SNAPSHOT,
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        }
      );
      expect(disableResponse.statusCode).toBe(200);
      expect(disableResponse.body).toStrictEqual({ ok: true });

      const disabledTask = await getHistorySnapshotTask(kbnClient);
      expect(disabledTask.attributes?.enabled).toBe(false);

      const disabledGlobalState = await getGlobalState(kbnClient);
      expect(disabledGlobalState.attributes?.historySnapshot?.status).toBe('stopped');

      const enableResponse = await apiClient.put(
        ENTITY_STORE_ROUTES.public.ENABLE_HISTORY_SNAPSHOT,
        {
          headers: defaultHeaders,
          responseType: 'json',
          body: {},
        }
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
    'returns 404 when enabling the history snapshot task before install',
    async ({ apiClient }) => {
      await uninstall(apiClient);

      const response = await apiClient.put(ENTITY_STORE_ROUTES.public.ENABLE_HISTORY_SNAPSHOT, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(response.statusCode).toBe(404);
    }
  );
});
