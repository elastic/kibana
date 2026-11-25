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

const buildPutData = (overrides: Parameters<typeof buildCreateExternalSourceData>[0] = {}) => {
  const { id, ...data } = buildCreateExternalSourceData(overrides);
  return data;
};

apiTest.describe('Upsert external source API', { tag: testData.API_ENGINE_TAG }, () => {
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

  apiTest('should create the import at the given id', async ({ apiClient }) => {
    const data = buildPutData();

    const response = await apiClient.put(getExternalSourceUrl('scout-import-upsert'), {
      headers: writerHeaders,
      body: data,
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body).toMatchObject({
      id: 'scout-import-upsert',
      type: data.type,
      kind: data.kind,
      metadata: data.metadata,
      version: 1,
    });
  });

  apiTest(
    'should replace an existing import and keep its connector',
    async ({ apiClient, apiServices }) => {
      const existing = await apiServices.alertingV2.externalSources.create(
        buildCreateExternalSourceData({
          id: 'scout-import-upsert',
          metadata: { name: 'Before replace', description: 'Dropped on replace', tags: ['old'] },
        })
      );

      const response = await apiClient.put(getExternalSourceUrl('scout-import-upsert'), {
        headers: writerHeaders,
        body: buildPutData({ kind: 'signal', metadata: { name: 'After replace' } }),
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toMatchObject({
        id: 'scout-import-upsert',
        type: 'datadog',
        kind: 'signal',
        metadata: { name: 'After replace' },
        connector_id: existing.connector_id,
        version: 2,
      });
      expect(response.body.metadata.description).toBeUndefined();

      const getResponse = await apiClient.get(getExternalSourceUrl('scout-import-upsert'), {
        headers: writerHeaders,
      });
      expect(getResponse.body).toStrictEqual(response.body);
    }
  );

  apiTest('should return 400 for a connector id in the body', async ({ apiClient }) => {
    const response = await apiClient.put(getExternalSourceUrl('scout-import-upsert'), {
      headers: writerHeaders,
      body: { ...buildPutData(), connector_id: 'some-connector' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should return 400 when the type is missing', async ({ apiClient }) => {
    const { type, ...withoutType } = buildPutData();

    const response = await apiClient.put(getExternalSourceUrl('scout-import-upsert'), {
      headers: writerHeaders,
      body: withoutType,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should return 400 when the body has an id', async ({ apiClient }) => {
    const response = await apiClient.put(getExternalSourceUrl('scout-import-upsert'), {
      headers: writerHeaders,
      body: { ...buildPutData(), id: 'scout-import-upsert' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: should return 403 for a user with read-only alerts privileges',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTING_V2_ALERTS_READ_ROLE);

      const response = await apiClient.put(getExternalSourceUrl('scout-import-upsert'), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
        body: buildPutData(),
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
