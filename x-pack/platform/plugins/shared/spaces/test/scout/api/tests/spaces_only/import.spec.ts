/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, expect, tags } from '@kbn/scout';

const SPACES = {
  DEFAULT: {
    spaceId: 'default',
    name: 'Default',
    description: 'This is the default space',
    disabledFeatures: [],
  },
  SPACE_1: {
    spaceId: 'space_1',
    name: 'Space 1',
    description: 'This is the first test space',
    disabledFeatures: [],
  },
  SPACE_2: {
    spaceId: 'space_2',
    name: 'Space 2',
    description: 'This is the second test space',
    disabledFeatures: [],
  },
} as const;

const ATTRIBUTE_TITLE_KEY = 'title';
const ATTRIBUTE_TITLE_VALUE = `Hello world`;

const TEST_SPACES = [SPACES.DEFAULT, SPACES.SPACE_1] as const;

TEST_SPACES.forEach((space) => {
  apiTest.describe(`_import API within the ${space.name} space`, { tag: tags.ESS_ONLY }, () => {
    apiTest.beforeAll(async ({ kbnClient, log }) => {
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

    apiTest.afterAll(async ({ kbnClient, log }) => {
      // Delete the space (skip for default)
      if (space.spaceId !== SPACES.DEFAULT.spaceId) {
        await kbnClient.spaces.delete(space.spaceId);
        log.info(`Deleted space [${space.spaceId}] after test suite`);
      }
    });

    apiTest(
      'should return 409 when trying to create dashboard that already exists',
      async ({ apiServices }) => {
        // Use unique ID to prevent conflicts between test runs and spaces
        const uniqueId = `dashboard-${Date.now()}-${space.spaceId}`;

        // First import should succeed
        const response1 = await apiServices.savedObjects.import(
          {
            objects: [
              {
                type: 'dashboard',
                id: uniqueId,
                attributes: { [ATTRIBUTE_TITLE_KEY]: ATTRIBUTE_TITLE_VALUE },
              },
            ],
            overwrite: true,
          },
          space.spaceId
        );
        expect(response1.status).toBe(200);
        expect(response1.data.success).toBe(true);
        expect(response1.data.successCount).toBe(1);

        // Second import without overwrite should fail with conflict
        const response2 = await apiServices.savedObjects.import(
          {
            objects: [
              {
                type: 'dashboard',
                id: uniqueId,
                attributes: { [ATTRIBUTE_TITLE_KEY]: ATTRIBUTE_TITLE_VALUE },
              },
            ],
            overwrite: false,
          },
          space.spaceId
        );
        expect(response2.status).toBe(200);
        expect(response2.data.success).toBe(false);
        expect(response2.data.errors).toBeDefined();
        expect(response2.data.errors).toHaveLength(1);
        expect(response2.data.errors![0].error.type).toBe('conflict');

        // Cleanup
        await apiServices.savedObjects.delete('dashboard', uniqueId, space.spaceId);
      }
    );

    apiTest('should return 200 when creating with overwrite=true', async ({ apiServices }) => {
      const uniqueId = `dashboard-overwrite-${Date.now()}-${space.spaceId}`;

      // Import initial object
      const response1 = await apiServices.savedObjects.import(
        {
          objects: [
            {
              type: 'dashboard',
              id: uniqueId,
              attributes: { [ATTRIBUTE_TITLE_KEY]: ATTRIBUTE_TITLE_VALUE },
            },
          ],
          overwrite: false,
        },
        space.spaceId
      );
      expect(response1.status).toBe(200);
      expect(response1.data.success).toBe(true);
      expect(response1.data.successCount).toBe(1);

      // Import with overwrite should succeed
      const response2 = await apiServices.savedObjects.import(
        {
          objects: [
            {
              type: 'dashboard',
              id: uniqueId,
              attributes: { [ATTRIBUTE_TITLE_KEY]: ATTRIBUTE_TITLE_VALUE },
            },
          ],
          overwrite: true,
        },
        space.spaceId
      );
      expect(response2.status).toBe(200);
      expect(response2.data.success).toBe(true);
      expect(response2.data.successCount).toBe(1);
      expect(response2.data.successResults).toBeDefined();
      expect(response2.data.successResults![0].type).toBe('dashboard');
      expect(response2.data.successResults![0].id).toBe(uniqueId);

      // Cleanup
      await apiServices.savedObjects.delete('dashboard', uniqueId, space.spaceId);
    });

    apiTest(
      'should return 200 and auto-generate ID when creating without ID',
      async ({ apiServices }) => {
        const uniqueId = `dashboard-autogen-${Date.now()}-${space.spaceId}`;

        const response = await apiServices.savedObjects.import(
          {
            objects: [
              {
                type: 'dashboard',
                id: uniqueId,
                attributes: { [ATTRIBUTE_TITLE_KEY]: ATTRIBUTE_TITLE_VALUE },
              },
            ],
            overwrite: false,
          },
          space.spaceId
        );

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.successCount).toBe(1);
        expect(response.data.successResults).toBeDefined();
        expect(response.data.successResults![0].type).toBe('dashboard');
        expect(response.data.successResults![0].id).toBe(uniqueId);

        // Cleanup
        await apiServices.savedObjects.delete('dashboard', uniqueId, space.spaceId);
      }
    );

    apiTest('should return 400 when creating hidden type object', async ({ apiServices }) => {
      const response = await apiServices.savedObjects.import(
        {
          objects: [
            {
              type: 'hiddentype',
              id: 'some-id',
              attributes: { [ATTRIBUTE_TITLE_KEY]: ATTRIBUTE_TITLE_VALUE },
            },
          ],
          overwrite: false,
        },
        space.spaceId
      );

      // Import API returns 200 but with success=false and errors for invalid types
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(false);
      expect(response.data.errors).toBeDefined();
      expect(response.data.errors).toHaveLength(1);
      expect(response.data.errors![0].error.type).toBe('unsupported_type');
    });
  });
});
