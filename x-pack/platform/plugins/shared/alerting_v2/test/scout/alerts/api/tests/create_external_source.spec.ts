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
  ALERTING_V2_ALERTS_ALL_ROLE,
  apiTest,
  buildCreateExternalSourceData,
  getConnectorUrl,
  getListExternalSourcesUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('Create external source API', { tag: testData.API_ENGINE_TAG }, () => {
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

  apiTest(
    'should create an import and a receive-only connector for its type',
    async ({ apiClient, apiServices }) => {
      const data = buildCreateExternalSourceData();

      const response = await apiClient.post(getListExternalSourcesUrl(), {
        headers: writerHeaders,
        body: data,
      });

      expect(response).toHaveStatusCode(201);
      expect(typeof response.body.id).toBe('string');
      expect(response.body).toMatchObject({
        type: data.type,
        kind: data.kind,
        metadata: data.metadata,
        version: 1,
      });

      expect(await apiServices.alertingV2.externalSources.exists(response.body.id)).toBe(true);

      const connectorResponse = await apiClient.get(getConnectorUrl(response.body.connector_id), {
        headers: writerHeaders,
      });
      expect(connectorResponse).toHaveStatusCode(200);
      expect(connectorResponse.body).toMatchObject({
        connector_type_id: '.datadog',
        name: data.metadata.name,
        config: expect.objectContaining({ authType: 'none' }),
      });
    }
  );

  apiTest('should return 400 for a connector id in the body', async ({ apiClient }) => {
    const response = await apiClient.post(getListExternalSourcesUrl(), {
      headers: writerHeaders,
      body: { ...buildCreateExternalSourceData(), connector_id: 'some-connector' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should create an import with the supplied id', async ({ apiClient }) => {
    const response = await apiClient.post(getListExternalSourcesUrl(), {
      headers: writerHeaders,
      body: buildCreateExternalSourceData({ id: 'scout-import-custom-id' }),
    });

    expect(response).toHaveStatusCode(201);
    expect(response.body.id).toBe('scout-import-custom-id');
  });

  apiTest('should return 409 when the id is already taken', async ({ apiClient, apiServices }) => {
    await apiServices.alertingV2.externalSources.create(
      buildCreateExternalSourceData({ id: 'scout-import-taken' })
    );

    const response = await apiClient.post(getListExternalSourcesUrl(), {
      headers: writerHeaders,
      body: buildCreateExternalSourceData({
        id: 'scout-import-taken',
        metadata: { name: 'Second import' },
      }),
    });

    expect(response).toHaveStatusCode(409);
    expect(response.body.code).toBe('EXTERNAL_SOURCE_ALREADY_EXISTS');
  });

  apiTest('should return 400 when the type is missing', async ({ apiClient }) => {
    const { type, ...withoutType } = buildCreateExternalSourceData();

    const response = await apiClient.post(getListExternalSourcesUrl(), {
      headers: writerHeaders,
      body: withoutType,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should return 400 for an unknown type', async ({ apiClient }) => {
    const response = await apiClient.post(getListExternalSourcesUrl(), {
      headers: writerHeaders,
      body: { ...buildCreateExternalSourceData(), type: 'pagerduty' },
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should return 400 for routing tags on a signal import', async ({ apiClient }) => {
    const response = await apiClient.post(getListExternalSourcesUrl(), {
      headers: writerHeaders,
      body: buildCreateExternalSourceData({ kind: 'signal' }),
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: should return 403 and create nothing for a user without connector privileges',
    async ({ apiClient, apiServices, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTING_V2_ALERTS_ALL_ROLE);

      const response = await apiClient.post(getListExternalSourcesUrl(), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
        body: buildCreateExternalSourceData({ id: 'scout-import-no-connectors' }),
      });

      expect(response).toHaveStatusCode(403);

      expect(
        await apiServices.alertingV2.externalSources.exists('scout-import-no-connectors')
      ).toBe(false);
    }
  );

  apiTest(
    'authorization: should return 403 for a user with read-only alerts privileges',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTING_V2_ALERTS_READ_ROLE);

      const response = await apiClient.post(getListExternalSourcesUrl(), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
        body: buildCreateExternalSourceData(),
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_ACCESS_ROLE);

      const response = await apiClient.post(getListExternalSourcesUrl(), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
        body: buildCreateExternalSourceData(),
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
