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
import { FF_ENABLE_ENTITY_STORE_V2, FF_DUAL_PROCESS_ENABLED } from '../../../../../common';
import {
  getStatus,
  installAllEntityTypes,
  uninstallAllEntityTypes,
  waitForStoreNotInstalled,
  type ApiClientFixture,
} from '../../../common/fixtures/helpers';

const NON_PRIORITY_TASK_ID = 'entity_store:v2:extract_entity_non_priority_task:user:default';
const PRIORITY_TASK_ID = 'entity_store:v2:extract_entity_task:user:default';

apiTest.describe(
  'Entity Store per-process configuration and control',
  { tag: ENTITY_STORE_TAGS },
  () => {
    let publicHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    const userEngine = async (apiClient: ApiClientFixture) => {
      const status = await getStatus(apiClient, publicHeaders);
      expect(status.statusCode).toBe(200);
      const engine = status.body.engines.find((e) => e.type === 'user');
      expect(engine).toBeDefined();
      return engine!;
    };

    const setEngineConfig = (apiClient: ApiClientFixture, body: Record<string, unknown>) =>
      apiClient.put(ENTITY_STORE_ROUTES.internal.ENGINE_CONFIG('user'), {
        headers: internalHeaders,
        responseType: 'json',
        body,
      });

    const taskExists = async (
      kbnClient: { savedObjects: { get: (o: { type: string; id: string }) => Promise<unknown> } },
      id: string
    ) => {
      try {
        await kbnClient.savedObjects.get({ type: 'task', id });
        return true;
      } catch {
        return false;
      }
    };

    apiTest.beforeAll(async ({ samlAuth }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      publicHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
      internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };
    });

    apiTest.beforeEach(async ({ kbnClient, apiClient, apiServices }) => {
      await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });
      await apiServices.core.settings({
        'feature_flags.overrides': { [FF_DUAL_PROCESS_ENABLED]: true },
      });

      await uninstallAllEntityTypes(apiClient, publicHeaders).catch(() => {});
      await waitForStoreNotInstalled(apiClient, publicHeaders);
      expect((await installAllEntityTypes(apiClient, publicHeaders)).statusCode).toBe(201);
    });

    apiTest.afterEach(async ({ apiClient, apiServices }) => {
      await uninstallAllEntityTypes(apiClient, publicHeaders).catch(() => {});
      await apiServices.core.settings({
        'feature_flags.overrides': { [FF_DUAL_PROCESS_ENABLED]: false },
      });
    });

    apiTest('stores a non-priority override and reports it on status', async ({ apiClient }) => {
      expect(
        (
          await setEngineConfig(apiClient, {
            nonPriorityOverride: { samplingRate: 0.5, frequency: '5m' },
          })
        ).statusCode
      ).toBe(200);

      expect((await userEngine(apiClient)).nonPriority?.samplingRate).toBe(0.5);
    });

    apiTest('a later global update does not clear the per-type override', async ({ apiClient }) => {
      await setEngineConfig(apiClient, { nonPriorityOverride: { samplingRate: 0.5 } });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: publicHeaders,
        responseType: 'json',
        body: { logExtraction: { frequency: '7m' } },
      });
      expect(update.statusCode).toBe(200);

      const engine = await userEngine(apiClient);
      expect(engine.nonPriority?.samplingRate).toBe(0.5);
      expect(engine.frequency).toBe('7m');
    });

    apiTest('null clears one field and leaves the rest alone', async ({ apiClient }) => {
      await setEngineConfig(apiClient, {
        nonPriorityOverride: { samplingRate: 0.5, frequency: '5m' },
      });

      const cleared = await setEngineConfig(apiClient, {
        nonPriorityOverride: { samplingRate: null },
      });
      expect(cleared.statusCode).toBe(200);
      expect(cleared.body.nonPriorityLogExtractionConfig.samplingRate).toBeNull();
      expect(cleared.body.nonPriorityLogExtractionConfig.frequency).toBe('5m');

      const engine = await userEngine(apiClient);
      expect(engine.nonPriority?.samplingRate).toBeNull();
    });

    apiTest('rejects a sampling rate outside [0.1, 1]', async ({ apiClient }) => {
      const response = await setEngineConfig(apiClient, {
        nonPriorityOverride: { samplingRate: 0.05 },
      });

      expect(response.statusCode).toBe(400);
    });

    apiTest(
      'stopping the non-priority process leaves the priority task scheduled',
      async ({ apiClient, kbnClient }) => {
        expect(await taskExists(kbnClient, NON_PRIORITY_TASK_ID)).toBe(true);

        const stop = await apiClient.put(ENTITY_STORE_ROUTES.internal.STOP, {
          headers: internalHeaders,
          responseType: 'json',
          body: { entityTypes: ['user'], process: 'nonPriority' },
        });
        expect(stop.statusCode).toBe(200);

        expect(await taskExists(kbnClient, NON_PRIORITY_TASK_ID)).toBe(false);
        expect(await taskExists(kbnClient, PRIORITY_TASK_ID)).toBe(true);
        expect((await userEngine(apiClient)).nonPriority?.status).toBe('stopped');
      }
    );

    apiTest(
      'starting the non-priority process reschedules only its task',
      async ({ apiClient, kbnClient }) => {
        await apiClient.put(ENTITY_STORE_ROUTES.internal.STOP, {
          headers: internalHeaders,
          responseType: 'json',
          body: { entityTypes: ['user'], process: 'nonPriority' },
        });

        const start = await apiClient.put(ENTITY_STORE_ROUTES.internal.START, {
          headers: internalHeaders,
          responseType: 'json',
          body: { entityTypes: ['user'], process: 'nonPriority' },
        });
        expect(start.statusCode).toBe(200);

        expect(await taskExists(kbnClient, NON_PRIORITY_TASK_ID)).toBe(true);
        expect((await userEngine(apiClient)).nonPriority?.status).toBe('started');
      }
    );

    apiTest(
      'rejects a non-priority request for a type without that process',
      async ({ apiClient }) => {
        const response = await apiClient.put(ENTITY_STORE_ROUTES.internal.STOP, {
          headers: internalHeaders,
          responseType: 'json',
          body: { entityTypes: ['host'], process: 'nonPriority' },
        });

        expect(response.statusCode).toBe(400);
      }
    );

  }
);
