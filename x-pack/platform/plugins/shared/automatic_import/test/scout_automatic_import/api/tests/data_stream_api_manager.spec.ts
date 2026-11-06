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
  MANAGER_DS_FLOW_DATA_STREAM_ID,
  MANAGER_DS_FLOW_INTEGRATION_ID,
  dataStreamsApiBasePath,
  scoutApiErrorText,
} from '../fixtures/api_test_constants';

// Failing: See https://github.com/elastic/kibana/issues/259261
apiTest.describe.skip(
  'automatic_import Data Stream API (manager)',
  { tag: tags.stateful.all },
  () => {
    let cookieHeader: Record<string, string>;
    const dsBasePath = dataStreamsApiBasePath(MANAGER_DS_FLOW_INTEGRATION_ID);

    apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
      await apiServices.autoImport.createIntegrationWithDataStream(
        MANAGER_DS_FLOW_INTEGRATION_ID,
        'Scout Manager DS Flow Integration',
        MANAGER_DS_FLOW_DATA_STREAM_ID,
        'Scout Manager DS Flow'
      );
      ({ cookieHeader } = await samlAuth.asAutoImportManager());
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.autoImport.cleanupIntegrations([MANAGER_DS_FLOW_INTEGRATION_ID]);
    });

    apiTest(
      'manager flow: upload samples, reject edits before analysis completes, delete data stream',
      async ({ apiClient }) => {
        const uploadResponse = await apiClient.post(
          `${dsBasePath}/${MANAGER_DS_FLOW_DATA_STREAM_ID}/upload`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: {
              samples: ['{"message":"scout-manager-flow-sample"}'],
              originalSource: { sourceType: 'file', sourceValue: 'manager-flow.log' },
            },
            responseType: 'json',
          }
        );
        expect(uploadResponse).toHaveStatusCode(200);

        const editsResponse = await apiClient.put(
          `${dsBasePath}/${MANAGER_DS_FLOW_DATA_STREAM_ID}/edits`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
            body: {
              ingest_pipeline: {
                processors: [{ set: { field: 'scout_api_test_marker', value: true } }],
              },
              changes: [],
              version: 'WzEsMV0=',
            },
            responseType: 'json',
          }
        );
        expect(editsResponse).toHaveStatusCode(400);
        expect(scoutApiErrorText(editsResponse.body)).toContain('has not completed yet');

        const deleteResponse = await apiClient.delete(
          `${dsBasePath}/${MANAGER_DS_FLOW_DATA_STREAM_ID}`,
          {
            headers: { ...COMMON_API_HEADERS, ...cookieHeader },
          }
        );
        expect(deleteResponse).toHaveStatusCode(200);
      }
    );
  }
);
