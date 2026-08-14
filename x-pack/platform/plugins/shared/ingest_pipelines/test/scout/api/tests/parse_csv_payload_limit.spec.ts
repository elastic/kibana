/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { parseCsvMaxFileBytes } from '../../../../server/routes/api/parse_csv';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'Ingest pipelines parse CSV payload limit API',
  { tag: tags.stateful.classic },
  () => {
    const managePipelineRole = {
      elasticsearch: {
        cluster: ['manage_pipeline', 'cluster:monitor/nodes/info'],
      },
      kibana: [],
    };

    apiTest('accepts a mapping CSV within the payload limit', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(managePipelineRole);
      const response = await apiClient.post(testData.PARSE_CSV_API_PATH, {
        headers: {
          ...testData.COMMON_HEADERS,
          ...cookieHeader,
        },
        body: {
          file: testData.PIPELINE_MAPPINGS_CSV,
          copyAction: 'copy',
        },
      });

      expect(response).toHaveStatusCode(200);
    });

    apiTest(
      'rejects a body larger than the route maxBytes at the HTTP layer',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(managePipelineRole);
        // A `file` value one byte over the ceiling pushes the request body past
        // `options.body.maxBytes`, so hapi rejects it before the handler runs.
        const oversizedFile = 'a'.repeat(parseCsvMaxFileBytes + 1);
        const response = await apiClient.post(testData.PARSE_CSV_API_PATH, {
          headers: {
            ...testData.COMMON_HEADERS,
            ...cookieHeader,
          },
          body: {
            file: oversizedFile,
            copyAction: 'copy',
          },
        });

        expect(response).toHaveStatusCode(413);
      }
    );
  }
);
