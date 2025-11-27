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

const NEW_ATTRIBUTE_KEY = 'title';
const NEW_ATTRIBUTE_VAL = `New attribute value ${Date.now()}`;

const TEST_SPACES = [SPACES.DEFAULT, SPACES.SPACE_1] as const;

TEST_SPACES.forEach((space) => {
  apiTest.describe(`_create API within the ${space.name} space`, { tag: tags.ESS_ONLY }, () => {
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

        // First creation should succeed
        const response1 = await apiServices.savedObjects.create(
          {
            type: 'dashboard',
            id: uniqueId,
            attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
            overwrite: true,
          },
          space.spaceId
        );
        expect(response1.status).toBe(200);

        // Second creation should fail with 409
        const response2 = await apiServices.savedObjects.create(
          {
            type: 'dashboard',
            id: uniqueId,
            attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
            overwrite: false,
          },
          space.spaceId
        );
        expect(response2.status).toBe(409);
        expect(response2.data.error).toBe('Conflict');
        expect(response2.data.message).toBe(`Saved object [dashboard/${uniqueId}] conflict`);

        // Cleanup
        await apiServices.savedObjects.delete('dashboard', uniqueId, space.spaceId);
      }
    );

    apiTest('should return 200 when creating with overwrite=true', async ({ apiServices }) => {
      const uniqueId = `dashboard-overwrite-${Date.now()}-${space.spaceId}`;

      // Create initial object
      const response1 = await apiServices.savedObjects.create(
        {
          type: 'dashboard',
          id: uniqueId,
          attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
          overwrite: false,
        },
        space.spaceId
      );
      expect(response1.status).toBe(200);

      // Overwrite should succeed
      const response2 = await apiServices.savedObjects.create(
        {
          type: 'dashboard',
          id: uniqueId,
          attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
          overwrite: true,
        },
        space.spaceId
      );
      expect(response2.status).toBe(200);
      expect(response2.data.type).toBe('dashboard');
      expect(response2.data.id).toBe(uniqueId);
      expect(response2.data.namespaces).toStrictEqual([space.spaceId]);

      // Cleanup
      await apiServices.savedObjects.delete('dashboard', uniqueId, space.spaceId);
    });

    apiTest(
      'should return 200 and auto-generate ID when creating without ID',
      async ({ apiServices }) => {
        const response = await apiServices.savedObjects.create(
          {
            type: 'dashboard',
            attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
            overwrite: false,
          },
          space.spaceId
        );

        expect(response.status).toBe(200);
        expect(response.data.type).toBe('dashboard');
        expect(response.data.id).toBeDefined();
        expect(response.data.attributes[NEW_ATTRIBUTE_KEY]).toBe(NEW_ATTRIBUTE_VAL);
        expect(response.data.namespaces).toStrictEqual([space.spaceId]);

        // Cleanup
        await apiServices.savedObjects.delete('dashboard', response.data.id, space.spaceId);
      }
    );

    apiTest('should return 400 when creating hidden type object', async ({ apiServices }) => {
      const response = await apiServices.savedObjects.create(
        {
          type: 'hiddentype',
          id: 'some-id',
          attributes: { [NEW_ATTRIBUTE_KEY]: NEW_ATTRIBUTE_VAL },
          overwrite: false,
        },
        space.spaceId
      );

      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Bad Request');
    });
  });
});
