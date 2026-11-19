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

apiTest.describe(
  'automatic_import Data Stream API (no automatic_import privilege)',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;
    const dsBasePath = dataStreamsApiBasePath(DATA_STREAMS_INTEGRATION_ID);

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.autoImport.createIntegration(
        DATA_STREAMS_INTEGRATION_ID,
        'Scout DS Test Integration'
      );
      ({ cookieHeader } = await samlAuth.asAutoImportNoAccess());
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.autoImport.cleanupIntegrations([DATA_STREAMS_INTEGRATION_ID]);
    });

    apiTest(
      'GET /data_streams/{id}/results: returns 403 for no-access user',
      async ({ apiClient, apiServices }) => {
        const dsId = 'scout_results_noaccess_ds';
        await apiServices.autoImport.createIntegrationWithDataStream(
          DATA_STREAMS_INTEGRATION_ID,
          'Scout DS Test Integration',
          dsId,
          'Scout Results No Access DS'
        );

        const response = await apiClient.get(`${dsBasePath}/${dsId}/results`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(403);
      }
    );
  }
);
