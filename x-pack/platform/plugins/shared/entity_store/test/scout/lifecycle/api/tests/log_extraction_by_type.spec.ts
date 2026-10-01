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

apiTest.describe(
  'Entity Store per entity-type log extraction config',
  { tag: ENTITY_STORE_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;
    let internalHeaders: Record<string, string>;

    /** `frequency` and `delay` for one engine, as reported by the status route. */
    const engineConfig = async (apiClient: ApiClientFixture, type: string) => {
      const status = await getStatus(apiClient, defaultHeaders);
      expect(status.statusCode).toBe(200);
      const engine = status.body.engines.find((e) => e.type === type);
      expect(engine).toBeDefined();
      return { frequency: engine?.frequency, delay: engine?.delay };
    };

    const update = (apiClient: ApiClientFixture, body: Record<string, unknown>) =>
      apiClient.put(ENTITY_STORE_ROUTES.public.UPDATE, {
        headers: defaultHeaders,
        responseType: 'json',
        body,
      });

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

    apiTest.beforeEach(async ({ kbnClient, apiClient, apiServices }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });
      // Set explicitly rather than relying on the default: the flag can already be on from a
      // Cloud rollout or another suite, and two cases below assert the flag-off behaviour.
      await apiServices.core.settings({
        'feature_flags.overrides': { [FF_DUAL_PROCESS_ENABLED]: false },
      });

      await uninstallAllEntityTypes(apiClient, defaultHeaders).catch(() => {});
      await waitForStoreNotInstalled(apiClient, defaultHeaders);
    });

    apiTest.afterEach(async ({ apiClient, apiServices, kbnClient }) => {
      await uninstallAllEntityTypes(apiClient, defaultHeaders).catch(() => {});
      // This suite forces the dual-process flag off, so teardown has to drop the override
      // instead of leaving the next suite with it. Only `null` removes it.
      await apiServices.core.settings({
        'feature_flags.overrides': { [FF_DUAL_PROCESS_ENABLED]: null },
      });
      await kbnClient.uiSettings.unset(FF_ENABLE_ENTITY_STORE_V2);
    });

    apiTest(
      'reports identical config for every engine when nothing is overridden',
      async ({ apiClient }) => {
        expect((await installAllEntityTypes(apiClient, defaultHeaders)).statusCode).toBe(201);

        const status = await getStatus(apiClient, defaultHeaders);
        expect(status.statusCode).toBe(200);
        expect(status.body.engines).toHaveLength(4);

        const [first, ...rest] = status.body.engines.map(
          ({
            frequency,
            delay,
            lookbackPeriod,
            maxLogsPerWindow,
            maxLogsPerWindowCapBehavior,
          }) => ({
            frequency,
            delay,
            lookbackPeriod,
            maxLogsPerWindow,
            maxLogsPerWindowCapBehavior,
          })
        );
        rest.forEach((engine) => expect(engine).toStrictEqual(first));
      }
    );

    apiTest(
      'setting a store-wide field to null falls back to the built-in default',
      async ({ apiClient }) => {
        await installAllEntityTypes(apiClient, defaultHeaders);

        await update(apiClient, { logExtraction: { frequency: '5m' } });
        expect((await engineConfig(apiClient, 'user')).frequency).toBe('5m');

        expect((await update(apiClient, { logExtraction: { frequency: null } })).statusCode).toBe(
          200
        );
        expect((await engineConfig(apiClient, 'user')).frequency).toBe('1m');
      }
    );

    // The dual-process flag is off in this suite. Per-type config is not a dual-process
    // feature, so the route has to work here.
    apiTest('sets a per-type override without the dual-process flag', async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);

      const response = await apiClient.put(ENTITY_STORE_ROUTES.internal.ENGINE_CONFIG('service'), {
        headers: internalHeaders,
        responseType: 'json',
        body: { logExtraction: { frequency: '10m' } },
      });
      expect(response.statusCode).toBe(200);

      expect((await engineConfig(apiClient, 'service')).frequency).toBe('10m');
      expect((await engineConfig(apiClient, 'user')).frequency).toBe('1m');
    });

    apiTest('rejects nonPriorityOverride without the dual-process flag', async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);

      const response = await apiClient.put(ENTITY_STORE_ROUTES.internal.ENGINE_CONFIG('user'), {
        headers: internalHeaders,
        responseType: 'json',
        body: { nonPriorityOverride: { samplingRate: 0.5 } },
      });

      expect(response.statusCode).toBe(400);
    });
  }
);
