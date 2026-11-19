/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { autoImportApiTest as apiTest, COMMON_API_HEADERS } from '../fixtures';
import {
  INTEGRATION_API_BASE_PATH,
  NON_EXISTENT_INTEGRATION_ID,
  SHARED_INTEGRATION_ID,
} from '../fixtures/api_test_constants';

/**
 * A role with only the base Kibana `all` privilege and no automatic_import feature entry.
 * The feature follows base privileges, so this user gets the same access as `automatic_import: all`.
 */
apiTest.describe(
  'automatic_import Integration API (base "all" privilege)',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.autoImport.createIntegration(
        SHARED_INTEGRATION_ID,
        'Scout Shared Integration'
      );
      ({ cookieHeader } = await samlAuth.asAutoImportBaseAll());
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.autoImport.cleanupIntegrations([SHARED_INTEGRATION_ID]);
    });

    apiTest('GET /integrations: returns 200 for base "all" user', async ({ apiClient }) => {
      const response = await apiClient.get(INTEGRATION_API_BASE_PATH, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    apiTest(
      'PUT /integrations: passes authorization (400 on an empty body, not 403) for base "all" user',
      async ({ apiClient }) => {
        const response = await apiClient.put(INTEGRATION_API_BASE_PATH, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          body: {},
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest(
      'DELETE /integrations/{id}: passes authorization (404 on a missing id, not 403) for base "all" user',
      async ({ apiClient }) => {
        const response = await apiClient.delete(
          `${INTEGRATION_API_BASE_PATH}/${NON_EXISTENT_INTEGRATION_ID}`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            responseType: 'json',
          }
        );
        expect(response).toHaveStatusCode(404);
      }
    );
  }
);
