/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../../constants';
import { apiTest } from '../../fixtures';

/**
 * Serverless-specific spaces CRUD tests.
 * Feature visibility cannot be set in serverless — the create/update tests
 * verifying that disabledFeatures is rejected are unique to serverless.
 */
apiTest.describe(
  'Spaces CRUD',
  {
    tag: [
      ...tags.serverless.observability.complete,
      ...tags.serverless.search,
      ...tags.serverless.security.complete,
    ],
  },
  () => {
    let adminApiCredentials: RoleApiCredentials;
    const createdSpaceIds: string[] = [];

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    apiTest.afterAll(async ({ apiServices }) => {
      for (const id of createdSpaceIds) {
        await apiServices.spaces.delete(id);
      }
    });

    apiTest('should allow us to create a space', async ({ apiClient }) => {
      const response = await apiClient.post('api/spaces/space', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        body: { id: 'custom_space_1', name: 'custom_space_1', disabledFeatures: [] },
      });

      expect(response).toHaveStatusCode(200);
      createdSpaceIds.push('custom_space_1');
    });

    apiTest(
      'should not allow us to create a space with disabled features',
      async ({ apiClient }) => {
        const response = await apiClient.post('api/spaces/space', {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          body: { id: 'custom_space_2', name: 'custom_space_2', disabledFeatures: ['discover'] },
        });

        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest('should allow us to get a space', async ({ apiClient, apiServices }) => {
      await apiServices.spaces.create({ id: 'space_to_get_1' });
      createdSpaceIds.push('space_to_get_1');

      const { body } = await apiClient.get('api/spaces/space/space_to_get_1', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      });

      expect(body).toMatchObject({
        id: 'space_to_get_1',
        name: 'space_to_get_1',
        disabledFeatures: [],
      });
    });

    apiTest('should allow us to get all spaces', async ({ apiClient }) => {
      const { body } = await apiClient.get('api/spaces/space', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      });

      expect(body).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'default', name: 'Default', _reserved: true }),
        ])
      );
    });

    apiTest('should allow us to update a space', async ({ apiClient, apiServices }) => {
      await apiServices.spaces.create({ id: 'space_to_update' });
      createdSpaceIds.push('space_to_update');

      const updateResponse = await apiClient.put('api/spaces/space/space_to_update', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        body: {
          id: 'space_to_update',
          name: 'some new name',
          initials: 'SN',
          disabledFeatures: [],
        },
      });
      expect(updateResponse).toHaveStatusCode(200);

      const { body } = await apiClient.get('api/spaces/space/space_to_update', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      });

      expect(body).toMatchObject({
        id: 'space_to_update',
        name: 'some new name',
        initials: 'SN',
        disabledFeatures: [],
      });
    });

    apiTest(
      'should not allow us to update a space with disabled features',
      async ({ apiClient, apiServices }) => {
        await apiServices.spaces.create({ id: 'space_to_update_disabled' });
        createdSpaceIds.push('space_to_update_disabled');

        const response = await apiClient.put('api/spaces/space/space_to_update_disabled', {
          headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
          body: {
            id: 'space_to_update_disabled',
            name: 'some new name',
            initials: 'SN',
            disabledFeatures: ['discover'],
          },
        });

        expect(response).toHaveStatusCode(400);
      }
    );

    apiTest('should allow us to delete a space', async ({ apiClient, apiServices }) => {
      await apiServices.spaces.create({ id: 'space_to_delete' });

      const response = await apiClient.delete('api/spaces/space/space_to_delete', {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
      });

      expect(response).toHaveStatusCode(204);
    });
  }
);
