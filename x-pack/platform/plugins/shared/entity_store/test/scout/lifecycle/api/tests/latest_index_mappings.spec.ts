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
  ENTITY_STORE_TAGS,
  LATEST_INDEX,
} from '../../../common/fixtures/constants';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common';
import {
  LATEST_INDEX_MAPPINGS_VERSION,
  LATEST_INDEX_MAPPINGS_VERSION_META_KEY,
  MAPPING_VERSION,
} from '../../../../../common/domain/entity_index';
import {
  clearEntityStoreIndices,
  installAllEntityTypes,
  uninstallAllEntityTypes,
} from '../../../common/fixtures/helpers';

apiTest.describe(
  'latest index mappings are installed with the entity store',
  { tag: ENTITY_STORE_TAGS },
  () => {
    let defaultHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      const credentials = await samlAuth.asInteractiveUser('admin');
      defaultHeaders = {
        ...credentials.cookieHeader,
        ...PUBLIC_HEADERS,
      };

      await kbnClient.uiSettings.update({
        [FF_ENABLE_ENTITY_STORE_V2]: true,
      });
    });

    apiTest.afterEach(async ({ apiClient, esClient }) => {
      await uninstallAllEntityTypes(apiClient, defaultHeaders);
      await clearEntityStoreIndices(esClient);
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await kbnClient.uiSettings.unset(FF_ENABLE_ENTITY_STORE_V2);
    });

    apiTest(
      'maps user.entity.id as keyword and stamps the mappings version on a fresh install',
      async ({ apiClient, esClient }) => {
        const install = await installAllEntityTypes(apiClient, defaultHeaders);
        expect(install.statusCode).toBe(201);

        const mappingResponse = await esClient.indices.getMapping({ index: LATEST_INDEX });
        const { mappings } = mappingResponse[LATEST_INDEX];

        expect(mappings.properties).toMatchObject({
          user: { properties: { entity: { properties: { id: { type: 'keyword' } } } } },
        });
        expect(mappings._meta).toMatchObject({
          mappingsVersion: MAPPING_VERSION,
          [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
        });
      }
    );

    apiTest('keeps the latest index in lookup mode', async ({ apiClient, esClient }) => {
      const install = await installAllEntityTypes(apiClient, defaultHeaders);
      expect(install.statusCode).toBe(201);

      const settingsResponse = await esClient.indices.getSettings({ index: LATEST_INDEX });

      expect(settingsResponse[LATEST_INDEX].settings?.index?.mode).toBe('lookup');
    });

    apiTest(
      'does not change the mappings version when install is called again',
      async ({ apiClient, esClient }) => {
        const install = await installAllEntityTypes(apiClient, defaultHeaders);
        expect(install.statusCode).toBe(201);

        const reinstall = await installAllEntityTypes(apiClient, defaultHeaders);
        expect(reinstall.statusCode).toBe(200);

        const mappingResponse = await esClient.indices.getMapping({ index: LATEST_INDEX });

        expect(mappingResponse[LATEST_INDEX].mappings._meta).toMatchObject({
          mappingsVersion: MAPPING_VERSION,
          [LATEST_INDEX_MAPPINGS_VERSION_META_KEY]: LATEST_INDEX_MAPPINGS_VERSION,
        });
      }
    );
  }
);
