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
  getListExternalSourcesUrl,
  NO_ACCESS_ROLE,
  testData,
} from '../fixtures';

apiTest.describe('List external sources API', { tag: testData.API_ENGINE_TAG }, () => {
  let writerHeaders: Record<string, string>;
  let alphaConnectorId: string;

  apiTest.beforeAll(async ({ samlAuth, apiServices }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(
      ALERTING_V2_ALERTS_AND_CONNECTORS_ALL_ROLE
    );
    writerHeaders = { ...cookieHeader, ...testData.COMMON_HEADERS };

    await apiServices.alertingV2.externalSources.cleanUp();
    ({ connector_id: alphaConnectorId } = await apiServices.alertingV2.externalSources.create(
      buildCreateExternalSourceData({
        id: 'scout-import-alpha',
        metadata: { name: 'Alpha production', routing_tags: ['scout'] },
      })
    ));
    await apiServices.alertingV2.externalSources.create(
      buildCreateExternalSourceData({
        id: 'scout-import-bravo',
        metadata: { name: 'Bravo staging', routing_tags: ['scout'] },
      })
    );
    await apiServices.alertingV2.externalSources.create(
      buildCreateExternalSourceData({
        id: 'scout-import-charlie',
        kind: 'signal',
        metadata: { name: 'Charlie signals' },
      })
    );
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.alertingV2.externalSources.cleanUp();
  });

  apiTest('should return every import with default pagination', async ({ apiClient }) => {
    const response = await apiClient.get(getListExternalSourcesUrl(), { headers: writerHeaders });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toMatchObject({ total: 3, page: 1, per_page: 20 });
    expect(response.body.items).toHaveLength(3);
  });

  apiTest('should paginate and sort by name', async ({ apiClient }) => {
    const response = await apiClient.get(
      getListExternalSourcesUrl({ per_page: 2, page: 2, sort_field: 'name', sort_order: 'asc' }),
      { headers: writerHeaders }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(3);
    expect(response.body.items.map(({ id }: { id: string }) => id)).toStrictEqual([
      'scout-import-charlie',
    ]);
  });

  apiTest('should filter by connector id', async ({ apiClient }) => {
    const response = await apiClient.get(
      getListExternalSourcesUrl({ connector_id: alphaConnectorId }),
      { headers: writerHeaders }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.items.map(({ id }: { id: string }) => id)).toStrictEqual([
      'scout-import-alpha',
    ]);
  });

  apiTest('should filter by type and sort by it', async ({ apiClient }) => {
    const response = await apiClient.get(
      getListExternalSourcesUrl({ type: 'datadog', sort_field: 'type' }),
      { headers: writerHeaders }
    );

    expect(response).toHaveStatusCode(200);
    expect(response.body.total).toBe(3);
    expect(response.body.items.every(({ type }: { type: string }) => type === 'datadog')).toBe(
      true
    );
  });

  apiTest('should return 400 for an unknown type', async ({ apiClient }) => {
    const response = await apiClient.get(getListExternalSourcesUrl({ type: 'splunk' }), {
      headers: writerHeaders,
    });

    expect(response).toHaveStatusCode(400);
  });

  apiTest('should search import names', async ({ apiClient }) => {
    const response = await apiClient.get(getListExternalSourcesUrl({ search: 'staging' }), {
      headers: writerHeaders,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.items.map(({ id }: { id: string }) => id)).toStrictEqual([
      'scout-import-bravo',
    ]);
  });

  apiTest('should return 400 when per_page is above the maximum', async ({ apiClient }) => {
    const response = await apiClient.get(
      getListExternalSourcesUrl({ per_page: testData.MAX_PER_PAGE + 1 }),
      { headers: writerHeaders }
    );

    expect(response).toHaveStatusCode(400);
  });

  apiTest(
    'authorization: should return 200 for a user with read-only alerts privileges',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(ALERTING_V2_ALERTS_READ_ROLE);

      const response = await apiClient.get(getListExternalSourcesUrl(), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body.total).toBe(3);
    }
  );

  apiTest(
    'authorization: should return 403 for a user without alerting_v2 privileges',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(NO_ACCESS_ROLE);

      const response = await apiClient.get(getListExternalSourcesUrl(), {
        headers: { ...cookieHeader, ...testData.COMMON_HEADERS },
      });

      expect(response).toHaveStatusCode(403);
    }
  );
});
