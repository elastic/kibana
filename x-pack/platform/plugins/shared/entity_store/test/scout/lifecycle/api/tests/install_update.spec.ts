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
  INTERNAL_HEADERS,
  ENTITY_STORE_ROUTES,
  ENTITY_STORE_TAGS,
} from '../../../common/fixtures/constants';
import {
  FF_ENABLE_ENTITY_STORE_V2,
  type GetEntityMaintainersResponse,
} from '../../../../../common';
import {
  uninstallAllEntityTypes,
  waitForStoreNotInstalled,
} from '../../../common/fixtures/helpers';

apiTest.describe('Entity Store install / update API tests', { tag: ENTITY_STORE_TAGS }, () => {
  let defaultHeaders: Record<string, string>;
  let internalHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const credentials = await samlAuth.asInteractiveUser('admin');
    defaultHeaders = {
      ...credentials.cookieHeader,
      ...PUBLIC_HEADERS,
    };
    internalHeaders = {
      ...credentials.cookieHeader,
      ...INTERNAL_HEADERS,
    };
  });

  apiTest.beforeEach(async ({ kbnClient, apiClient }) => {
    await kbnClient.uiSettings.update({
      [FF_ENABLE_ENTITY_STORE_V2]: true,
    });

    // Clean up any state leaked by a previous test that failed mid-install.
    await uninstallAllEntityTypes(apiClient, defaultHeaders).catch(() => {});

    // Require N consecutive not_installed responses - each request can land on
    // a different node, so a streak gives confidence all nodes have converged.
    await waitForStoreNotInstalled(apiClient, defaultHeaders);
  });

  apiTest(
    'Should install the entity store happy path with feature flag enabled',
    async ({ apiClient }) => {
      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(install.statusCode).toBe(201);

      const maintainersResponse = await apiClient.get(
        ENTITY_STORE_ROUTES.internal.ENTITY_MAINTAINERS_GET,
        {
          headers: internalHeaders,
          responseType: 'json',
        }
      );
      expect(maintainersResponse.statusCode).toBe(200);
      const { maintainers } = maintainersResponse.body as GetEntityMaintainersResponse;
      expect(maintainers.length).toBeGreaterThan(0);
      expect(maintainers.every((m) => m.taskStatus === 'started')).toBe(true);

      const uninstall = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
      expect(uninstall.statusCode).toBe(200);
    }
  );

  apiTest('Should fail with feature flag disabled', async ({ apiClient, kbnClient }) => {
    await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: false });
    await kbnClient.uiSettings.waitForEventualCacheRefresh();

    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(403);
  });

  apiTest('logExtraction is not mandatory on install', async ({ apiClient }) => {
    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(install.statusCode).toBe(201);

    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest('Update on uninstalled store should return 404', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });

    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { frequency: '1m' } },
    });
    expect(update.statusCode).toBe(404);
  });

  apiTest('update requires logExtraction or historySnapshot', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });

    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
    expect(update.statusCode).toBe(400);

    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest('Update should change installed logExtraction params', async ({ apiClient }) => {
    await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { delay: '2m' } },
    });

    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { logExtraction: { delay: '5m' } },
    });
    expect(update.statusCode).toBe(200);

    const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
      headers: defaultHeaders,
      responseType: 'json',
    });
    expect(status.statusCode).toBe(200);
    const engines = (status.body as { engines: Array<{ delay: string }> }).engines;
    expect(engines.length).toBeGreaterThan(0);
    expect(engines[0].delay).toBe('5m');

    await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: {},
    });
  });

  apiTest(
    'Update should change history snapshot interval and retention',
    async ({ apiClient, kbnClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { historySnapshot: { frequency: '24h', retentionDays: 30 } },
      });

      const afterInstall = await kbnClient.savedObjects.get({
        type: 'entity-store-global-state',
        id: 'entity-store-global-state-default',
      });
      const logsExtractionAfterInstall = afterInstall.attributes?.logsExtraction;

      // Update both history snapshot configs
      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { historySnapshot: { frequency: '12h', retentionDays: 90 } },
      });
      expect(update.statusCode).toBe(200);

      const globalState = await kbnClient.savedObjects.get({
        type: 'entity-store-global-state',
        id: 'entity-store-global-state-default',
      });
      expect(globalState.attributes?.historySnapshot?.status).toBe('started');
      expect(globalState.attributes?.historySnapshot?.frequency).toBe('12h');
      expect(globalState.attributes?.historySnapshot?.retentionDays).toBe(90);
      expect(globalState.attributes?.logsExtraction).toStrictEqual(logsExtractionAfterInstall);

      const task = await kbnClient.savedObjects.get({
        type: 'task',
        id: 'entity_store:v2:history_snapshot_task:default',
      });
      expect(task.attributes?.schedule?.interval).toBe('12h');

      // Update frequency only
      const frequencyOnly = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { historySnapshot: { frequency: '6h' } },
      });
      expect(frequencyOnly.statusCode).toBe(200);

      const afterFrequencyUpdate = await kbnClient.savedObjects.get({
        type: 'entity-store-global-state',
        id: 'entity-store-global-state-default',
      });
      expect(afterFrequencyUpdate.attributes?.historySnapshot?.frequency).toBe('6h');
      expect(afterFrequencyUpdate.attributes?.historySnapshot?.retentionDays).toBe(90);

      const taskAfterFrequencyUpdate = await kbnClient.savedObjects.get({
        type: 'task',
        id: 'entity_store:v2:history_snapshot_task:default',
      });
      expect(taskAfterFrequencyUpdate.attributes?.schedule?.interval).toBe('6h');

      // Update retention days only
      const retentionOnly = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { historySnapshot: { retentionDays: 15 } },
      });
      expect(retentionOnly.statusCode).toBe(200);

      const afterRetentionUpdate = await kbnClient.savedObjects.get({
        type: 'entity-store-global-state',
        id: 'entity-store-global-state-default',
      });
      expect(afterRetentionUpdate.attributes?.historySnapshot?.frequency).toBe('6h');
      expect(afterRetentionUpdate.attributes?.historySnapshot?.retentionDays).toBe(15);
      const taskAfterRetentionUpdate = await kbnClient.savedObjects.get({
        type: 'task',
        id: 'entity_store:v2:history_snapshot_task:default',
      });
      expect(taskAfterRetentionUpdate.attributes?.schedule?.interval).toBe('6h');

      // Update log extraction settings
      const logExtractionUpdate = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { frequency: '2m', lookbackPeriod: '1h' } },
      });
      expect(logExtractionUpdate.statusCode).toBe(200);

      const afterLogExtractionUpdate = await kbnClient.savedObjects.get({
        type: 'entity-store-global-state',
        id: 'entity-store-global-state-default',
      });
      expect(afterLogExtractionUpdate.attributes?.logsExtraction?.frequency).toBe('2m');
      expect(afterLogExtractionUpdate.attributes?.logsExtraction?.lookbackPeriod).toBe('1h');
      // history snapshot settings must be unchanged
      expect(afterLogExtractionUpdate.attributes?.historySnapshot?.frequency).toBe('6h');
      expect(afterLogExtractionUpdate.attributes?.historySnapshot?.retentionDays).toBe(15);
      expect(afterLogExtractionUpdate.attributes?.historySnapshot?.status).toBe('started');
      const taskAfterLogExtractionUpdate = await kbnClient.savedObjects.get({
        type: 'task',
        id: 'entity_store:v2:history_snapshot_task:default',
      });
      expect(taskAfterLogExtractionUpdate.attributes?.schedule?.interval).toBe('6h');

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );

  apiTest(
    'update rejects a history snapshot interval shorter than 1 hour',
    async ({ apiClient }) => {
      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { historySnapshot: { frequency: '30m' } },
      });
      expect(update.statusCode).toBe(400);
    }
  );

  apiTest('install rejects unknown body keys', async ({ apiClient }) => {
    const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { non_valid_property: 1 },
    });
    expect(install.statusCode).toBe(400);
  });

  apiTest('update rejects unknown body keys', async ({ apiClient }) => {
    const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { non_valid_property: 1 },
    });
    expect(update.statusCode).toBe(400);
  });

  apiTest('uninstall rejects unknown body keys', async ({ apiClient }) => {
    const uninstall = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
      headers: defaultHeaders,
      responseType: 'json',
      body: { non_valid_property: 1 },
    });
    expect(uninstall.statusCode).toBe(400);
  });

  apiTest(
    'Update should not change logExtraction properties that were not included in the update',
    async ({ apiClient }) => {
      await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '2m', frequency: '1m' } },
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body: { logExtraction: { delay: '5m' } },
      });
      expect(update.statusCode).toBe(200);

      const status = await apiClient.get(ENTITY_STORE_ROUTES.public.STATUS, {
        headers: defaultHeaders,
        responseType: 'json',
      });
      expect(status.statusCode).toBe(200);
      const engines = (status.body as { engines: Array<{ delay: string; frequency: string }> })
        .engines;
      expect(engines.length).toBeGreaterThan(0);
      expect(engines[0].delay).toBe('5m');
      expect(engines[0].frequency).toBe('1m');

      await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {},
      });
    }
  );
});
