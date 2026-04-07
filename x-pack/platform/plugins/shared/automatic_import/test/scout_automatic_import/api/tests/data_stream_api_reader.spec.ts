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
  DATA_STREAMS_INTEGRATION_ID,
  dataStreamsApiBasePath,
} from '../fixtures/api_test_constants';

apiTest.describe('automatic_import Data Stream API (reader)', { tag: tags.stateful.all }, () => {
  let cookieHeader: Record<string, string>;
  const dsBasePath = dataStreamsApiBasePath(DATA_STREAMS_INTEGRATION_ID);

  apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
    await apiServices.autoImport.createIntegration(
      DATA_STREAMS_INTEGRATION_ID,
      'Scout DS Test Integration'
    );
    ({ cookieHeader } = await samlAuth.asAutoImportReader());
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.autoImport.cleanupIntegrations([DATA_STREAMS_INTEGRATION_ID]);
  });

  apiTest('POST /upload: returns 403 for reader user', async ({ apiClient, apiServices }) => {
    const dsId = 'scout-upload-reader-ds';
    await apiServices.autoImport.createIntegrationWithDataStream(
      DATA_STREAMS_INTEGRATION_ID,
      'Scout DS Test Integration',
      dsId,
      'Scout Upload Reader DS'
    );

    const response = await apiClient.post(`${dsBasePath}/${dsId}/upload`, {
      headers: { ...COMMON_API_HEADERS, ...cookieHeader },
      body: {
        samples: ['{"message":"test"}'],
        originalSource: { sourceType: 'file', sourceValue: 'test.log' },
      },
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(403);
  });

  apiTest(
    'DELETE /data_streams/{id}: returns 403 for reader user',
    async ({ apiClient, apiServices }) => {
      const dsId = 'scout-delete-reader-ds';
      await apiServices.autoImport.createIntegrationWithDataStream(
        DATA_STREAMS_INTEGRATION_ID,
        'Scout DS Test Integration',
        dsId,
        'Scout Reader Delete DS'
      );

      try {
        const response = await apiClient.delete(`${dsBasePath}/${dsId}`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      } finally {
        await apiServices.autoImport.deleteDataStream(DATA_STREAMS_INTEGRATION_ID, dsId);
      }
    }
  );

  apiTest(
    'PATCH /data_streams/{id}: returns 403 for reader user',
    async ({ apiClient, apiServices }) => {
      const dsId = 'scout-pipeline-reader-ds';
      await apiServices.autoImport.createIntegrationWithDataStream(
        DATA_STREAMS_INTEGRATION_ID,
        'Scout DS Test Integration',
        dsId,
        'Scout Pipeline Reader DS'
      );

      const response = await apiClient.patch(`${dsBasePath}/${dsId}`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: { ingest_pipeline: { processors: [] } },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest(
    'PUT /data_streams/{id}/reanalyze: returns 403 for reader user',
    async ({ apiClient, apiServices }) => {
      const dsId = 'scout-reanalyze-reader-ds';
      await apiServices.autoImport.createIntegrationWithDataStream(
        DATA_STREAMS_INTEGRATION_ID,
        'Scout DS Test Integration',
        dsId,
        'Scout Reanalyze Reader DS'
      );

      const response = await apiClient.put(`${dsBasePath}/${dsId}/reanalyze`, {
        headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        body: { connectorId: 'test-connector-placeholder' },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(403);
    }
  );
});
