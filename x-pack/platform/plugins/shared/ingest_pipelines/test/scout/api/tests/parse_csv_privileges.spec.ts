/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { apiTest, testData } from '../fixtures';

apiTest.describe(
  'Ingest pipelines parse CSV privileges API',
  { tag: tags.stateful.classic },
  () => {
    const managePipelineRole = {
      elasticsearch: {
        cluster: ['manage_pipeline', 'cluster:monitor/nodes/info'],
      },
      kibana: [],
    };
    const monitorOnlyRole = {
      elasticsearch: {
        cluster: ['monitor'],
      },
      kibana: [],
    };

    apiTest('allows access with manage pipeline privileges', async ({ apiClient, samlAuth }) => {
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

    apiTest('denies access without manage pipeline privileges', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(monitorOnlyRole);
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

      expect(response).toHaveStatusCode(401);
    });
  }
);
