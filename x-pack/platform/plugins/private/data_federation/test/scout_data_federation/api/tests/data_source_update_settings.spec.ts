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
import { COMMON_HEADERS, CUSTOM_ROLES, getDataSourceByIdApiPath } from '../fixtures';

interface GetDataSourceResponse {
  data_sources: Array<{
    name: string;
    type: string;
    description?: string;
    settings: Record<string, unknown>;
  }>;
}

const REGION = 'eu-central-1';
const ENDPOINT = `https://s3.${REGION}.amazonaws.com`;

apiTest.describe(
  'ES|QL Data Federation — data source update API',
  { tag: tags.stateful.classic },
  () => {
    const dataSourceName = `scout-data-source-${randomUUID().slice(0, 8)}`;
    let cookieHeader: RoleSessionCredentials['cookieHeader'];

    apiTest.beforeAll(async ({ samlAuth }) => {
      ({ cookieHeader } = await samlAuth.asInteractiveUser(CUSTOM_ROLES.data_source_manager));
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      try {
        await kbnClient.request({
          method: 'DELETE',
          path: getDataSourceByIdApiPath(dataSourceName),
        });
      } catch {
        // ignore cleanup errors
      }
    });

    apiTest('removes settings omitted from an update', async ({ apiClient }) => {
      const path = getDataSourceByIdApiPath(dataSourceName);
      const headers = { ...COMMON_HEADERS, ...cookieHeader };

      const getDataSource = async () => {
        const response = await apiClient.get<GetDataSourceResponse>(path, {
          headers,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        const [dataSource] = response.body.data_sources;
        return dataSource;
      };

      await apiTest.step('create an S3 data source with region and endpoint', async () => {
        const response = await apiClient.put(path, {
          headers,
          responseType: 'json',
          body: {
            type: 's3',
            description: 'Initial description',
            settings: { auth: 'anonymous', region: REGION, endpoint: ENDPOINT },
          },
        });
        expect(response).toHaveStatusCode(200);

        const { settings } = await getDataSource();
        expect(settings).toMatchObject({ region: REGION, endpoint: ENDPOINT });
      });

      await apiTest.step('update the description without region and endpoint', async () => {
        const response = await apiClient.put(path, {
          headers,
          responseType: 'json',
          body: {
            type: 's3',
            description: 'Updated description',
            settings: { auth: 'anonymous' },
          },
        });
        expect(response).toHaveStatusCode(200);
      });

      await apiTest.step('region and endpoint are removed', async () => {
        const { description, settings } = await getDataSource();
        expect(description).toBe('Updated description');
        expect(settings.auth).toBe('anonymous');
        expect(Object.keys(settings)).not.toContain('region');
        expect(Object.keys(settings)).not.toContain('endpoint');
      });
    });
  }
);
