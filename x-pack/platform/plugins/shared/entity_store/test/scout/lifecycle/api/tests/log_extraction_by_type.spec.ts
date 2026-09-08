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
    });

    apiTest.beforeEach(async ({ kbnClient, apiClient }) => {
      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });

      await uninstallAllEntityTypes(apiClient, defaultHeaders).catch(() => {});
      await waitForStoreNotInstalled(apiClient, defaultHeaders);
    });

    apiTest.afterEach(async ({ apiClient }) => {
      await uninstallAllEntityTypes(apiClient, defaultHeaders).catch(() => {});
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
      'applies a per entity-type override on top of the store-wide one',
      async ({ apiClient }) => {
        await installAllEntityTypes(apiClient, defaultHeaders);

        const response = await update(apiClient, {
          logExtraction: { frequency: '2m' },
          logExtractionByType: { service: { frequency: '10m' } },
        });
        expect(response.statusCode).toBe(200);

        expect(await engineConfig(apiClient, 'service')).toStrictEqual({
          frequency: '10m',
          delay: '1m',
        });
        expect(await engineConfig(apiClient, 'user')).toStrictEqual({
          frequency: '2m',
          delay: '1m',
        });
      }
    );

    apiTest(
      'a store-wide update does not overwrite a per entity-type override',
      async ({ apiClient }) => {
        await installAllEntityTypes(apiClient, defaultHeaders);

        await update(apiClient, { logExtractionByType: { service: { frequency: '10m' } } });
        expect((await update(apiClient, { logExtraction: { frequency: '5m' } })).statusCode).toBe(
          200
        );

        expect((await engineConfig(apiClient, 'service')).frequency).toBe('10m');
        expect((await engineConfig(apiClient, 'user')).frequency).toBe('5m');
        expect((await engineConfig(apiClient, 'host')).frequency).toBe('5m');
        expect((await engineConfig(apiClient, 'generic')).frequency).toBe('5m');
      }
    );

    apiTest(
      'setting a per entity-type field to null falls back to the store-wide value',
      async ({ apiClient }) => {
        await installAllEntityTypes(apiClient, defaultHeaders);

        await update(apiClient, {
          logExtraction: { frequency: '5m' },
          logExtractionByType: { service: { frequency: '10m' } },
        });
        expect((await engineConfig(apiClient, 'service')).frequency).toBe('10m');

        expect(
          (await update(apiClient, { logExtractionByType: { service: { frequency: null } } }))
            .statusCode
        ).toBe(200);
        expect((await engineConfig(apiClient, 'service')).frequency).toBe('5m');
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

    apiTest('accepts an update that only carries per entity-type params', async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);

      const response = await update(apiClient, {
        logExtractionByType: { generic: { delay: '3m' } },
      });
      expect(response.statusCode).toBe(200);
      expect((await engineConfig(apiClient, 'generic')).delay).toBe('3m');
      expect((await engineConfig(apiClient, 'user')).delay).toBe('1m');
    });

    apiTest(
      'rejects a per entity-type override for a type with no engine',
      async ({ apiClient }) => {
        const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: { entityTypes: ['user'] },
        });
        expect(install.statusCode).toBe(201);

        const response = await update(apiClient, {
          logExtractionByType: { service: { frequency: '10m' } },
        });
        expect(response.statusCode).toBe(400);
        expect((response.body as { message: string }).message).toContain('service');
      }
    );

    apiTest('rejects an unknown entity type key', async ({ apiClient }) => {
      await installAllEntityTypes(apiClient, defaultHeaders);

      const response = await update(apiClient, {
        logExtractionByType: { not_an_entity_type: { frequency: '10m' } },
      });
      expect(response.statusCode).toBe(400);
    });

    apiTest(
      'rejects a per entity-type field that is never read at runtime',
      async ({ apiClient }) => {
        await installAllEntityTypes(apiClient, defaultHeaders);

        const response = await update(apiClient, {
          logExtractionByType: { service: { fieldHistoryLength: 20 } },
        });
        expect(response.statusCode).toBe(400);
      }
    );

    apiTest('applies per entity-type params supplied at install time', async ({ apiClient }) => {
      const install = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
        headers: defaultHeaders,
        responseType: 'json',
        body: {
          logExtraction: { frequency: '2m' },
          logExtractionByType: { service: { frequency: '10m' } },
        },
      });
      expect(install.statusCode).toBe(201);

      expect((await engineConfig(apiClient, 'service')).frequency).toBe('10m');
      expect((await engineConfig(apiClient, 'user')).frequency).toBe('2m');
    });

    apiTest(
      'leaves an already-installed type alone when install is called again',
      async ({ apiClient }) => {
        const first = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: { logExtractionByType: { service: { frequency: '10m' } } },
        });
        expect(first.statusCode).toBe(201);
        expect((await engineConfig(apiClient, 'service')).frequency).toBe('10m');

        const second = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: { logExtractionByType: { service: { frequency: '20m' } } },
        });
        expect(second.statusCode).toBe(200);
        expect((await engineConfig(apiClient, 'service')).frequency).toBe('10m');
      }
    );

    apiTest(
      'drops the override when the type is uninstalled and reinstalled',
      async ({ apiClient }) => {
        await installAllEntityTypes(apiClient, defaultHeaders);
        await update(apiClient, {
          logExtraction: { frequency: '5m' },
          logExtractionByType: { service: { frequency: '10m' } },
        });
        expect((await engineConfig(apiClient, 'service')).frequency).toBe('10m');

        const uninstall = await apiClient.post(ENTITY_STORE_ROUTES.public.UNINSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: { entityTypes: ['service'] },
        });
        expect(uninstall.statusCode).toBe(200);

        const reinstall = await apiClient.post(ENTITY_STORE_ROUTES.public.INSTALL, {
          headers: defaultHeaders,
          responseType: 'json',
          body: { entityTypes: ['service'] },
        });
        expect(reinstall.statusCode).toBe(201);

        expect((await engineConfig(apiClient, 'service')).frequency).toBe('5m');
      }
    );

    apiTest(
      'validates per entity-type params the same way as store-wide ones',
      async ({ apiClient }) => {
        await installAllEntityTypes(apiClient, defaultHeaders);

        const tooFrequent = await update(apiClient, {
          logExtractionByType: { service: { frequency: '10s' } },
        });
        expect(tooFrequent.statusCode).toBe(400);

        const delayTooLong = await update(apiClient, {
          logExtractionByType: { service: { delay: '5h', lookbackPeriod: '1h' } },
        });
        expect(delayTooLong.statusCode).toBe(400);

        const badIndexPattern = await update(apiClient, {
          logExtractionByType: { service: { additionalIndexPatterns: ['has a space'] } },
        });
        expect(badIndexPattern.statusCode).toBe(400);
      }
    );
  }
);
