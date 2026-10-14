/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CookieHeader } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';
import {
  createReindexOperationWithLargeErrorMessage,
  getAdminCookieHeader,
} from '../fixtures/helpers';

// All Upgrade Assistant API tests remain skipped until Kibana has a stable way to test them.
// See https://github.com/elastic/kibana/issues/266002.
apiTest.describe.skip(
  'Upgrade Assistant APIs',
  { tag: testData.UPGRADE_ASSISTANT_API_TAGS },
  () => {
    const dotKibanaIndex = '.kibana';
    const fakeSavedObjectId = 'fakeSavedObjectId';
    const indexSettings = {
      number_of_shards: '3',
      number_of_replicas: '2',
      refresh_interval: '1s',
    };

    let adminCookieHeader: CookieHeader;

    apiTest.beforeAll(async ({ samlAuth }) => {
      adminCookieHeader = await getAdminCookieHeader(samlAuth);
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient
        .delete({ index: dotKibanaIndex, id: fakeSavedObjectId })
        .catch(() => undefined);
      await esClient.indices
        .delete({ index: testData.INDEX_SETTINGS_TEST_INDEX })
        .catch(() => undefined);
    });

    apiTest(
      'indexes a reindex operation saved object with an immense error message',
      async ({ esClient }) => {
        const result = await esClient.create({
          index: dotKibanaIndex,
          id: fakeSavedObjectId,
          document: createReindexOperationWithLargeErrorMessage(),
        });

        expect(result).toBeDefined();
      }
    );

    apiTest('removes index settings', async ({ apiClient, esClient }) => {
      await esClient.indices
        .delete({ index: testData.INDEX_SETTINGS_TEST_INDEX })
        .catch(() => undefined);
      await esClient.indices.create({
        index: testData.INDEX_SETTINGS_TEST_INDEX,
        settings: {
          index: indexSettings,
        },
      });

      const response = await apiClient.post(
        `${testData.API_BASE_PATH}/${testData.INDEX_SETTINGS_TEST_INDEX}/index_settings`,
        {
          headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
          body: {
            settings: testData.INDEX_SETTINGS_TO_REMOVE,
          },
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ acknowledged: true });

      const indexSettingsResponse = await esClient.indices.getSettings({
        index: testData.INDEX_SETTINGS_TEST_INDEX,
      });
      const updatedIndexSettings =
        indexSettingsResponse[testData.INDEX_SETTINGS_TEST_INDEX].settings?.index;

      expect(updatedIndexSettings?.number_of_shards).toBe(indexSettings.number_of_shards);
      expect(updatedIndexSettings?.number_of_replicas).toBe(indexSettings.number_of_replicas);
      expect(updatedIndexSettings?.refresh_interval).toBeUndefined();
    });

    apiTest(
      'returns an error when removing settings from a missing index',
      async ({ apiClient }) => {
        const response = await apiClient.post(
          `${testData.API_BASE_PATH}/index_does_not_exist/index_settings`,
          {
            headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
            body: {
              settings: testData.INDEX_SETTINGS_TO_REMOVE,
            },
          }
        );

        expect(response).toHaveStatusCode(500);
        expect(response.body.error).toBe('Internal Server Error');
      }
    );

    apiTest('returns upgrade status', async ({ apiClient }) => {
      const response = await apiClient.get(`${testData.API_BASE_PATH}/status`, {
        headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.readyForUpgrade).toBeDefined();
      expect(response.body.details).toBeDefined();
    });

    apiTest('returns upgrade status when upgrading to the next minor', async ({ apiClient }) => {
      const response = await apiClient.get(`${testData.API_BASE_PATH}/status?targetVersion=9.1.0`, {
        headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.readyForUpgrade).toBeDefined();
      expect(response.body.details).toBeDefined();
    });

    apiTest('returns upgrade status when upgrading to the next major', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${testData.API_BASE_PATH}/status?targetVersion=10.0.0`,
        {
          headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.readyForUpgrade).toBeDefined();
      expect(response.body.details).toBeDefined();
    });

    apiTest('returns forbidden when upgrading more than one major', async ({ apiClient }) => {
      const response = await apiClient.get(
        `${testData.API_BASE_PATH}/status?targetVersion=11.0.0`,
        {
          headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
        }
      );

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBe('Forbidden');
    });

    apiTest('returns forbidden when attempting to downgrade', async ({ apiClient }) => {
      const response = await apiClient.get(`${testData.API_BASE_PATH}/status?targetVersion=8.0.0`, {
        headers: { ...testData.COMMON_HEADERS, ...adminCookieHeader },
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBe('Forbidden');
    });
  }
);
