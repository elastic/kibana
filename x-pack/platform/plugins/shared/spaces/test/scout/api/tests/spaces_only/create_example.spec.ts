/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, expect, tags } from '@kbn/scout';
import type { ApiClientFixture, KbnClient } from '@kbn/scout/src/playwright/fixtures/scope/worker';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

// Space IDs
const DEFAULT_SPACE_ID = 'default';
const SPACE_1_ID = 'space_1';

// Test attribute
const NEW_ATTRIBUTE_KEY = 'title';
const NEW_ATTRIBUTE_VAL = `New attribute value ${Date.now()}`;

// Test spaces configuration - add or remove spaces as needed
const TEST_SPACES = [
  { spaceId: DEFAULT_SPACE_ID, spaceName: 'default' },
  { spaceId: SPACE_1_ID, spaceName: 'space_1' },
] as const;

// This pattern runs the same tests across multiple spaces
TEST_SPACES.forEach(({ spaceId, spaceName }) => {
  apiTest.describe(`_create API within the ${spaceName} space`, { tag: tags.ESS_ONLY }, () => {
    let adminApiCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ requestAuth }) => {
      adminApiCredentials = await requestAuth.getApiKey('admin');
    });

    // Helper function - automatically uses the current spaceId from the loop
    const createSavedObject = async (
      apiClient: ApiClientFixture,
      type: string,
      id: string | undefined,
      overwrite: boolean
    ) => {
      const path = id ? `${type}/${id}` : type;
      return await apiClient.post(`s/${spaceId}/api/saved_objects/${path}?overwrite=${overwrite}`, {
        headers: { ...COMMON_HEADERS, ...adminApiCredentials.apiKeyHeader },
        body: { attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL } },
      });
    };

    const deleteSavedObject = async (kbnClient: KbnClient, id: string, type: string) => {
      await kbnClient.savedObjects.delete({ id, type });
    };

    // Test 1: Create duplicate should return 409
    apiTest(
      'should return 409 when trying to create dashboard that already exists',
      async ({ apiClient, kbnClient }) => {
        // Use unique ID to prevent conflicts between test runs and spaces
        const uniqueId = `dashboard-${Date.now()}-${spaceId}`;

        // First creation should succeed
        const response1 = await createSavedObject(apiClient, 'dashboard', uniqueId, true);
        expect(response1.statusCode).toBe(200);

        // Second creation should fail with 409
        const response2 = await createSavedObject(apiClient, 'dashboard', uniqueId, false);
        expect(response2.statusCode).toBe(409);
        expect(response2.body.error).toBe('Conflict');
        expect(response2.body.message).toBe(`Saved object [dashboard/${uniqueId}] conflict`);

        // Cleanup
        await deleteSavedObject(kbnClient, uniqueId, 'dashboard');
      }
    );

    // Test 2: Create with overwrite should succeed
    apiTest(
      'should return 200 when creating with overwrite=true',
      async ({ apiClient, kbnClient }) => {
        const uniqueId = `dashboard-overwrite-${Date.now()}-${spaceId}`;

        // Create initial object
        const response1 = await createSavedObject(apiClient, 'dashboard', uniqueId, false);
        expect(response1.statusCode).toBe(200);

        // Overwrite should succeed
        const response2 = await createSavedObject(apiClient, 'dashboard', uniqueId, true);
        expect(response2.statusCode).toBe(200);
        expect(response2.body.type).toBe('dashboard');
        expect(response2.body.id).toBe(uniqueId);
        expect(response2.body.namespaces).toStrictEqual([spaceId]);

        // Cleanup
        await deleteSavedObject(kbnClient, uniqueId, 'dashboard');
      }
    );

    // Test 3: Create without ID should generate one
    apiTest(
      'should return 200 and auto-generate ID when creating without ID',
      async ({ apiClient, kbnClient }) => {
        const response = await createSavedObject(apiClient, 'dashboard', undefined, false);

        expect(response.statusCode).toBe(200);
        expect(response.body.type).toBe('dashboard');
        expect(response.body.id).toBeDefined();
        expect(response.body.attributes[NEW_ATTRIBUTE_KEY]).toBe(NEW_ATTRIBUTE_VAL);
        expect(response.body.namespaces).toStrictEqual([spaceId]);

        // Cleanup
        await deleteSavedObject(kbnClient, response.body.id, 'dashboard');
      }
    );

    // Test 4: Create hidden type should return 400
    apiTest('should return 400 when creating hidden type object', async ({ apiClient }) => {
      const response = await createSavedObject(apiClient, 'hiddentype', 'some-id', false);

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Bad Request');
    });
  });
});
