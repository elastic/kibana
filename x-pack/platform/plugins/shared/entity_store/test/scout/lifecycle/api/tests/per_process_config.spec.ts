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
  forceLogExtraction,
  getStatus,
  installAllEntityTypes,
  uninstallAllEntityTypes,
  waitForStoreNotInstalled,
  type ApiClientFixture,
} from '../../../common/fixtures/helpers';

type SettingsFn = (settings: Record<string, unknown>) => Promise<unknown>;

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

    // Only a verified 404 counts as absence. Treating any read failure as "task gone" would let
    // the stop assertions pass on a transient error.
    const taskExists = async (
      kbnClient: { savedObjects: { get: (o: { type: string; id: string }) => Promise<unknown> } },
      id: string
    ) => {
      try {
        await kbnClient.savedObjects.get({ type: 'task', id });
        return true;
      } catch (error) {
        const { response, status } = error as { response?: { status?: number }; status?: number };
        if ((response?.status ?? status) === 404) return false;
        throw error;
      }
    };

    /**
     * Puts the non-priority process back in the started state. The stop cases below remove its
     * task, so any case that needs it running arranges it here rather than paying for a full
     * reinstall. The route skips a process that is already started, so this is cheap to repeat.
     */
    const startNonPriority = async (apiClient: ApiClientFixture) => {
      const response = await apiClient.put(ENTITY_STORE_ROUTES.internal.START, {
        headers: internalHeaders,
        responseType: 'json',
        body: { entityTypes: ['user'], process: 'nonPriority' },
      });
      expect(response.statusCode).toBe(200);
    };

    // Installing all four entity types costs an uninstall, a five-poll wait and an install. Doing
    // that once per case dominated the runtime of this file, and nothing here needs a pristine
    // store: the cases that mutate task state arrange what they need through the API instead.
    apiTest.beforeAll(async ({ samlAuth, kbnClient, apiClient, apiServices }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      publicHeaders = { ...credentials.cookieHeader, ...PUBLIC_HEADERS };
      internalHeaders = { ...credentials.cookieHeader, ...INTERNAL_HEADERS };

      await kbnClient.uiSettings.update({ [FF_ENABLE_ENTITY_STORE_V2]: true });
      await apiServices.core.settings({
        'feature_flags.overrides': { [FF_DUAL_PROCESS_ENABLED]: true },
      });

      await uninstallAllEntityTypes(apiClient, publicHeaders).catch(() => {});
      await waitForStoreNotInstalled(apiClient, publicHeaders);
      expect((await installAllEntityTypes(apiClient, publicHeaders)).statusCode).toBe(201);
    });

    // Three cases below turn the dual-process flag off, so it is restored per case. The V2 UI
    // setting is never changed by a case, so it stays in beforeAll.
    apiTest.beforeEach(async ({ apiServices }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [FF_DUAL_PROCESS_ENABLED]: true },
      });
    });

    apiTest.afterAll(async ({ apiClient, apiServices, kbnClient }) => {
      await uninstallAllEntityTypes(apiClient, publicHeaders).catch(() => {});
      // Remove the override rather than writing `false`: the deployment may have the flag on,
      // and writing a value would hand the next suite a state it never asked for.
      // `setDynamicConfigOverrides` merges by flattened key, so only `null` actually removes it.
      await apiServices.core.settings({
        'feature_flags.overrides': { [FF_DUAL_PROCESS_ENABLED]: null },
      });
      await kbnClient.uiSettings.unset(FF_ENABLE_ENTITY_STORE_V2);
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
      // Layer 5 would win over the global frequency asserted below, so clear it rather than
      // depending on no earlier case having written one.
      await setEngineConfig(apiClient, {
        logExtraction: { frequency: null },
        nonPriorityOverride: { samplingRate: 0.5 },
      });

      const update = await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: publicHeaders,
        responseType: 'json',
        body: { logExtraction: { frequency: '7m' } },
      });
      expect(update.statusCode).toBe(200);

      const engine = await userEngine(apiClient);
      expect(engine.nonPriority?.samplingRate).toBe(0.5);
      expect(engine.frequency).toBe('7m');

      // The global layer outlives this case now that the store is installed once for the file.
      // Only a full uninstall drops it, so clear the field here instead of leaving 7m behind.
      await apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: publicHeaders,
        responseType: 'json',
        body: { logExtraction: { frequency: null } },
      });
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
        await startNonPriority(apiClient);
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

    apiTest(
      'acts on the gated types when no entity types are given',
      async ({ apiClient, kbnClient }) => {
        await startNonPriority(apiClient);

        const stop = await apiClient.put(ENTITY_STORE_ROUTES.internal.STOP, {
          headers: internalHeaders,
          responseType: 'json',
          body: { process: 'nonPriority' },
        });

        expect(stop.statusCode).toBe(200);
        expect(await taskExists(kbnClient, NON_PRIORITY_TASK_ID)).toBe(false);
        expect(await taskExists(kbnClient, PRIORITY_TASK_ID)).toBe(true);
      }
    );

    apiTest('runs a forced extraction as the requested process', async ({ apiClient }) => {
      // A stopped non-priority process reports a skipped run, not a successful one.
      await startNonPriority(apiClient);

      const toDateISO = new Date().toISOString();
      const fromDateISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      for (const process of ['priority', 'nonPriority'] as const) {
        const response = await forceLogExtraction(
          apiClient,
          internalHeaders,
          'user',
          fromDateISO,
          toDateISO,
          process
        );

        expect(response.statusCode).toBe(200);
        expect((response.body as { success: boolean }).success).toBe(true);
      }
    });

    // `host` runs one process, so naming a dual-process one is rejected rather than run as a
    // failed extraction that writes an error onto a healthy engine.
    apiTest('rejects a forced extraction process the type does not run', async ({ apiClient }) => {
      const toDateISO = new Date().toISOString();
      const fromDateISO = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const response = await forceLogExtraction(
        apiClient,
        internalHeaders,
        'host',
        fromDateISO,
        toDateISO,
        'nonPriority'
      );

      expect(response.statusCode).toBe(400);
    });

    // The handler unit tests call the handlers directly and the middleware test calls the guard
    // directly, so only an HTTP call proves these routes are still wired to the middleware.
    const disableDualProcess = (apiServices: { core: { settings: SettingsFn } }) =>
      apiServices.core.settings({
        'feature_flags.overrides': { [FF_DUAL_PROCESS_ENABLED]: false },
      });

    apiTest(
      'does not serve start with the dual-process flag off',
      async ({ apiClient, apiServices }) => {
        await disableDualProcess(apiServices);

        const response = await apiClient.put(ENTITY_STORE_ROUTES.internal.START, {
          headers: internalHeaders,
          responseType: 'json',
          body: { entityTypes: ['user'], process: 'nonPriority' },
        });

        expect(response.statusCode).toBe(404);
      }
    );

    apiTest(
      'does not serve stop with the dual-process flag off',
      async ({ apiClient, apiServices }) => {
        await disableDualProcess(apiServices);

        const response = await apiClient.put(ENTITY_STORE_ROUTES.internal.STOP, {
          headers: internalHeaders,
          responseType: 'json',
          body: { entityTypes: ['user'], process: 'nonPriority' },
        });

        expect(response.statusCode).toBe(404);
      }
    );

    // The config route is not gated: layer 5 is read in every extraction mode.
    apiTest(
      'still serves the per-type config route with the flag off',
      async ({ apiClient, apiServices }) => {
        await disableDualProcess(apiServices);

        const response = await setEngineConfig(apiClient, {
          logExtraction: { frequency: '10m' },
        });

        expect(response.statusCode).toBe(200);
      }
    );
  }
);
