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
  testData,
} from '../fixtures';

apiTest.describe('Update external source API', { tag: testData.API_ENGINE_TAG }, () => {
  let writerHeaders: Record<string, string>;

  apiTest.beforeAll(async ({ samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(
      ALERTING_V2_ALERTS_AND_CONNECTORS_ALL_ROLE
    );
    writerHeaders = { ...cookieHeader, ...testData.COMMON_HEADERS };
  });

  apiTest.beforeEach(async ({ apiServices }) => {
    await apiServices.alertingV2.externalSources.cleanUp();
    await apiServices.alertingV2.externalSources.create(
      buildCreateExternalSourceData({
        id: 'scout-import-update',
        metadata: {
          name: 'Before update',
          description: 'Original description',
          routing_tags: ['scout'],
        },
      })
    );
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.externalSources.cleanUp();
  });

  apiTest(
    'should merge the patch, clear null fields and increment the version',
    async ({ apiClient }) => {
      const response = await apiClient.patch(getExternalSourceUrl('scout-import-update'), {
        headers: writerHeaders,
        body: { metadata: { name: 'After update', description: null } },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id: 'scout-import-update',
        kind: 'alert',
        metadata: { name: 'After update', routing_tags: ['scout'] },
        version: 2,
      });
      expect(response.body.metadata.description).toBeUndefined();
    }
  );

  apiTest('should return 400 when changing the connector id', async ({ apiClient }) => {
    const response = await apiClient.patch(getExternalSourceUrl('scout-import-update'), {
      headers: writerHeaders,
      body: { connector_id: 'another-connector' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should return 400 when sending a type', async ({ apiClient }) => {
    const response = await apiClient.patch(getExternalSourceUrl('scout-import-update'), {
      headers: writerHeaders,
      body: { type: 'datadog' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'should return 400 when switching to signal while routing tags are set',
    async ({ apiClient }) => {
      const response = await apiClient.patch(getExternalSourceUrl('scout-import-update'), {
        headers: writerHeaders,
        body: { kind: 'signal' },
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('INVALID_EXTERNAL_SOURCE_DATA');
    }
  );

  apiTest('should return 404 when no import has that id', async ({ apiClient }) => {
    const response = await apiClient.patch(getExternalSourceUrl('does-not-exist'), {
      headers: writerHeaders,
      body: { metadata: { name: 'Nope' } },
    });

    expect(response).toHaveStatusCode(404);
    expect(response.body.code).toBe('EXTERNAL_SOURCE_NOT_FOUND');
  });

  apiTest(
    'authorization: should return 403 for a user with read-only alerts privileges',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTING_V2_ALERTS_READ_ROLE);

      const response = await apiClient.patch(getExternalSourceUrl('scout-import-update'), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
        body: { metadata: { name: 'Not allowed' } },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
