/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import {
  ALERTING_V2_ALERTS_AND_CONNECTORS_ALL_ROLE,
  ALERTING_V2_ALERTS_READ_ROLE,
  apiTest,
  buildCreateExternalSourceData,
  getExternalSourceUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Get external source API', { tag: testData.API_ENGINE_TAG }, () => {
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(
      ALERTING_V2_ALERTS_AND_CONNECTORS_ALL_ROLE
    );
    writerHeaders = { ...cookieHeader, ...testData.COMMON_HEADERS };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.externalSources.cleanUp();
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.externalSources.cleanUp();
  });

  apiTest('should return the import', async ({ apiClient, apiServices }) => {
    const created = await apiServices.alertingV2.externalSources.create(
      buildCreateExternalSourceData({ id: 'scout-import-get' })
    );

    const response = await apiClient.get(getExternalSourceUrl('scout-import-get'), {
      headers: writerHeaders,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(created);
  });

  apiTest('should return 404 when no import has that id', async ({ apiClient }) => {
    const response = await apiClient.get(getExternalSourceUrl('does-not-exist'), {
      headers: writerHeaders,
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('EXTERNAL_SOURCE_NOT_FOUND');
  });

  apiTest(
    'authorization: should return 200 for a user with read-only alerts privileges',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.alertingV2.externalSources.create(
        buildCreateExternalSourceData({ id: 'scout-import-readable' })
      );
      const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTING_V2_ALERTS_READ_ROLE);

      const response = await apiClient.get(getExternalSourceUrl('scout-import-readable'), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.id).toBe('scout-import-readable');
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, apiServices, samlAuth }) => {
      await apiServices.alertingV2.externalSources.create(
        buildCreateExternalSourceData({ id: 'scout-import-hidden' })
      );
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_ACCESS_ROLE);

      const response = await apiClient.get(getExternalSourceUrl('scout-import-hidden'), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
