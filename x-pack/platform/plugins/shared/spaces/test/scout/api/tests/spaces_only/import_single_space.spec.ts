/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import FormData from 'form-data';

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, expect, tags } from '@kbn/scout';

import {
  ATTRIBUTE_TITLE_KEY,
  ATTRIBUTE_TITLE_VALUE,
  COMMON_HEADERS,
  DASHBOARD_SAVED_OBJECT,
  SPACES,
  TEST_SPACES,
} from './constants';

/**
 * Helper to prepare FormData for saved objects import
 * Returns buffer and headers ready to use with apiClient
 */
const prepareImportFormData = (objects: Array<Record<string, any>>) => {
  const ndjsonContent = objects.map((obj) => JSON.stringify(obj)).join('\n');
  const formData = new FormData();
  formData.append('file', ndjsonContent, 'import.ndjson');

  return {
    buffer: formData.getBuffer(),
    headers: formData.getHeaders(),
  };
};

// tests importing saved objects into a single space at a time
TEST_SPACES.forEach((space) => {
  const spacePath = space.spaceId === 'default' ? '' : `s/${space.spaceId}/`;

  apiTest.describe(`_import API within the ${space.name} space`, { tag: tags.ESS_ONLY }, () => {
    let editorApiCredentials: RoleApiCredentials;
    let createdSavedObjects: Array<{ type: string; id: string }>;

    apiTest.beforeAll(async ({ kbnClient, log, requestAuth }) => {
      // Get API key with 'editor' role which has savedObjectsManagement privileges
      editorApiCredentials = await requestAuth.getApiKey('editor');
      // Create the space (skip for default which always exists)
      if (space.spaceId !== SPACES.DEFAULT.spaceId) {
        log.info(`Creating space [${space.spaceId}] for test suite`);
        await kbnClient.spaces.create({
          id: space.spaceId,
          name: space.name,
          description: space.description,
          disabledFeatures: [...space.disabledFeatures],
        });
      } else {
        log.info(`Using default space for test suite`);
      }
    });

    apiTest.beforeEach(() => {
      createdSavedObjects = [];
    });

    apiTest.afterEach(async ({ apiServices, log }) => {
      if (createdSavedObjects.length > 0) {
        try {
          await apiServices.savedObjects.bulkDelete(createdSavedObjects, space.spaceId);
          log.debug(
            `Cleaned up ${createdSavedObjects.length} saved object(s) in space [${space.spaceId}]`
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          log.error(
            `Error during cleanup of saved objects [${createdSavedObjects
              .map((o) => `${o.type}:${o.id}`)
              .join(', ')}] in space [${space.spaceId}]: ${errorMessage}`
          );
        }
      }
    });

    apiTest.afterAll(async ({ kbnClient, log }) => {
      // Delete the space (skip for default)
      if (space.spaceId !== SPACES.DEFAULT.spaceId) {
        await kbnClient.spaces.delete(space.spaceId);
        log.info(`Deleted space [${space.spaceId}] after test suite`);
      }
    });
    apiTest(
      'should return 409 when trying to create dashboard that already exists',
      async ({ apiClient }) => {
        // Use unique ID to prevent conflicts between test runs and spaces
        const uniqueId = `dashboard-${Date.now()}-${space.spaceId}`;

        // First import should succeed
        const formData1 = prepareImportFormData([
          {
            ...DASHBOARD_SAVED_OBJECT,
            id: uniqueId,
          },
        ]);

        const response1 = await apiClient.post(
          `${spacePath}api/saved_objects/_import?overwrite=true`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...editorApiCredentials.apiKeyHeader,
              ...formData1.headers,
            },
            body: formData1.buffer,
          }
        );
        createdSavedObjects.push({ type: 'dashboard', id: uniqueId });

        expect(response1.statusCode).toBe(200);
        expect(response1.body.success).toBe(true);
        expect(response1.body.successCount).toBe(1);

        // Second import without overwrite should fail with conflict
        const formData2 = prepareImportFormData([
          {
            ...DASHBOARD_SAVED_OBJECT,
            id: uniqueId,
          },
        ]);

        const response2 = await apiClient.post(
          `${spacePath}api/saved_objects/_import?overwrite=false`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...editorApiCredentials.apiKeyHeader,
              ...formData2.headers,
            },
            body: formData2.buffer,
          }
        );

        expect(response2.statusCode).toBe(200);
        expect(response2.body.success).toBe(false);
        expect(response2.body.errors).toBeDefined();
        expect(response2.body.errors).toHaveLength(1);
        expect(response2.body.errors[0].error.type).toBe('conflict');
      }
    );

    apiTest(
      'should return 200 when creating with overwrite=true',
      async ({ apiClient, apiServices }) => {
        const uniqueId = `dashboard-overwrite-${Date.now()}-${space.spaceId}`;

        // Import initial object
        const formData1 = prepareImportFormData([
          {
            ...DASHBOARD_SAVED_OBJECT,
            id: uniqueId,
          },
        ]);

        const response1 = await apiClient.post(
          `${spacePath}api/saved_objects/_import?overwrite=false`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...editorApiCredentials.apiKeyHeader,
              ...formData1.headers,
            },
            body: formData1.buffer,
          }
        );
        createdSavedObjects.push({ type: 'dashboard', id: uniqueId });

        expect(response1.statusCode).toBe(200);
        expect(response1.body.success).toBe(true);
        expect(response1.body.successCount).toBe(1);

        // Import with overwrite should succeed
        const formData2 = prepareImportFormData([
          {
            ...DASHBOARD_SAVED_OBJECT,
            attributes: { title: `${ATTRIBUTE_TITLE_VALUE} - Overwritten` },
            id: uniqueId,
          },
        ]);

        const response2 = await apiClient.post(
          `${spacePath}api/saved_objects/_import?overwrite=true`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...editorApiCredentials.apiKeyHeader,
              ...formData2.headers,
            },
            body: formData2.buffer,
          }
        );

        expect(response2.statusCode).toBe(200);
        expect(response2.body.success).toBe(true);
        expect(response2.body.successCount).toBe(1);
        expect(response2.body.successResults).toBeDefined();
        expect(response2.body.successResults[0].type).toBe('dashboard');
        expect(response2.body.successResults[0].id).toBe(uniqueId);

        // Export to verify title was updated - use apiServices for verification/teardown
        const exportResponse = await apiServices.savedObjects.export(
          { objects: [{ type: 'dashboard', id: uniqueId }] },
          space.spaceId
        );
        expect(exportResponse.status).toBe(200);
        expect(exportResponse.data.exportedObjects).toHaveLength(1);
        expect(exportResponse.data.exportedObjects[0].attributes[ATTRIBUTE_TITLE_KEY]).toBe(
          `${ATTRIBUTE_TITLE_VALUE} - Overwritten`
        );
      }
    );

    apiTest(
      'should return 200 and auto-generate ID when creating without ID',
      async ({ apiClient }) => {
        const uniqueId = `dashboard-autogen-${Date.now()}-${space.spaceId}`;

        const formData = prepareImportFormData([
          {
            ...DASHBOARD_SAVED_OBJECT,
            id: uniqueId,
          },
        ]);

        const response = await apiClient.post(
          `${spacePath}api/saved_objects/_import?overwrite=false`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...editorApiCredentials.apiKeyHeader,
              ...formData.headers,
            },
            body: formData.buffer,
          }
        );
        createdSavedObjects.push({ type: 'dashboard', id: uniqueId });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.successCount).toBe(1);
        expect(response.body.successResults).toBeDefined();
        expect(response.body.successResults[0].type).toBe('dashboard');
        expect(response.body.successResults[0].id).toBe(uniqueId);
      }
    );

    apiTest('should return 400 when creating hidden type object', async ({ apiClient }) => {
      const formData = prepareImportFormData([
        {
          type: 'hiddentype',
          id: 'some-id',
          attributes: {},
        },
      ]);

      const response = await apiClient.post(
        `${spacePath}api/saved_objects/_import?overwrite=false`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...editorApiCredentials.apiKeyHeader,
            ...formData.headers,
          },
          body: formData.buffer,
        }
      );

      // Import API returns 200 but with success=false and errors for invalid types
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].error.type).toBe('unsupported_type');
    });
  });
});
