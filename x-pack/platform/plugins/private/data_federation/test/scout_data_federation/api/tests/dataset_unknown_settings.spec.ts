/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { apiTest, tags } from '@kbn/scout';
import type { RoleSessionCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import {
  COMMON_HEADERS,
  CUSTOM_ROLES,
  getDataSetByIdApiPath,
  getDataSourceByIdApiPath,
} from '../fixtures';

interface GetDataSetResponse {
  datasets: Array<{
    settings?: Record<string, unknown>;
  }>;
}

apiTest.describe(
  'ES|QL Data Federation — dataset settings not defined in the Kibana schema',
  { tag: tags.deploymentAgnostic },
  () => {
    const dataSourceName = `scout-data-source-${randomUUID().slice(0, 8)}`;
    const dataSetName = `scout-dataset-multiline-${randomUUID().slice(0, 8)}`;
    const invalidDataSetName = `scout-dataset-invalid-format-${randomUUID().slice(0, 8)}`;
    let credentials: RoleSessionCredentials;

    apiTest.beforeAll(async ({ samlAuth, kbnClient }) => {
      credentials = await samlAuth.asInteractiveUser(CUSTOM_ROLES.data_set_manager);
      await kbnClient.request({
        method: 'PUT',
        path: getDataSourceByIdApiPath(dataSourceName),
        body: {
          type: 's3',
          description: 'Scout unknown settings source',
          settings: {
            access_key: 'AKIAIOSFODNN7EXAMPLE',
            secret_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          },
        },
      });
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      for (const path of [
        getDataSetByIdApiPath(dataSetName),
        getDataSourceByIdApiPath(dataSourceName),
      ]) {
        try {
          await kbnClient.request({ method: 'DELETE', path });
        } catch {
          // ignore cleanup errors
        }
      }
    });

    apiTest(
      'creates a dataset with an unknown setting and returns it on get',
      async ({ apiClient }) => {
        const headers = { ...COMMON_HEADERS, ...credentials.cookieHeader };

        const createResponse = await apiClient.put(getDataSetByIdApiPath(dataSetName), {
          headers,
          body: {
            data_source: dataSourceName,
            resource: 's3://scout-bucket/path/**/*.csv',
            settings: { format: 'csv', multiline_fields: true },
          },
          responseType: 'json',
        });
        expect(createResponse).toHaveStatusCode(200);

        const getResponse = await apiClient.get(getDataSetByIdApiPath(dataSetName), {
          headers,
          responseType: 'json',
        });
        expect(getResponse).toHaveStatusCode(200);

        const {
          datasets: [savedDataSet],
        } = getResponse.body as GetDataSetResponse;
        expect(savedDataSet.settings).toMatchObject({ format: 'csv', multiline_fields: true });
      }
    );

    apiTest('rejects invalid values for settings Kibana defines', async ({ apiClient }) => {
      const response = await apiClient.put(getDataSetByIdApiPath(invalidDataSetName), {
        headers: { ...COMMON_HEADERS, ...credentials.cookieHeader },
        body: {
          data_source: dataSourceName,
          resource: 's3://scout-bucket/path/**/*.csv',
          settings: { format: 'not-a-format', multiline_fields: true },
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain('[request body.settings.format]');
    });
  }
);
