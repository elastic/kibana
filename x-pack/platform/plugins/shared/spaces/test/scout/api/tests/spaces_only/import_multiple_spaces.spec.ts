/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, expect, tags } from '@kbn/scout';

import { ATTRIBUTE_TITLE_KEY, ATTRIBUTE_TITLE_VALUE, SPACES } from './constants';

apiTest.describe(`_import API with multiple spaces`, { tag: tags.ESS_ONLY }, () => {
  // Note: since version 8.0, Kibana requires most saved objects to have globally unique IDs
  // Learn more: https://www.elastic.co/docs/explore-analyze/find-and-organize/saved-objects

  const spacesToCreate = [SPACES.SPACE_1, SPACES.SPACE_2];

  apiTest.beforeAll(async ({ kbnClient, log }) => {
    // Create space_1 and space_2 (default always exists)
    await Promise.all(
      spacesToCreate.map(async (space) => {
        log.info(`Creating ${space.spaceId} for multi-space test suite`);
        return kbnClient.spaces.create({
          id: space.spaceId,
          name: space.name,
          description: space.description,
          disabledFeatures: [...space.disabledFeatures],
        });
      })
    );
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    // Delete created spaces (skip default)
    await Promise.all(
      spacesToCreate.map(async (space) => {
        await kbnClient.spaces.delete(space.spaceId);
        log.info(`Deleted space [${space.spaceId}] after multi-space test suite`);
      })
    );
  });

  apiTest(
    'should import and export saved objects across different spaces',
    async ({ apiServices }) => {
      const objectId1 = `dashboard-id-1`;
      const objectId2 = `dashboard-id-2`;

      // Import dashboard to space_1
      const response1 = await apiServices.savedObjects.import(
        {
          objects: [
            {
              type: 'dashboard',
              id: objectId1,
              attributes: {
                [ATTRIBUTE_TITLE_KEY]: `${ATTRIBUTE_TITLE_VALUE} in ${SPACES.SPACE_1.spaceId}`,
              },
            },
          ],
          overwrite: false,
        },
        SPACES.SPACE_1.spaceId
      );

      expect(response1.status).toBe(200);
      expect(response1.data.success).toBe(true);
      expect(response1.data.successCount).toBe(1);

      // Import dashboard with a different ID to space_2
      const response2 = await apiServices.savedObjects.import(
        {
          objects: [
            {
              type: 'dashboard',
              id: objectId2,
              attributes: {
                [ATTRIBUTE_TITLE_KEY]: `${ATTRIBUTE_TITLE_VALUE} in ${SPACES.SPACE_2.spaceId}`,
              },
            },
          ],
          overwrite: false,
        },
        SPACES.SPACE_2.spaceId
      );

      expect(response2.status).toBe(200);
      expect(response2.data.success).toBe(true);
      expect(response2.data.successCount).toBe(1);

      // Verify the objects were both imported correctly in their respective spaces
      const export1 = await apiServices.savedObjects.export(
        { objects: [{ type: 'dashboard', id: objectId1 }] },
        SPACES.SPACE_1.spaceId
      );
      expect(export1.status).toBe(200);
      expect(export1.data.exportedObjects).toHaveLength(1);
      expect(export1.data.exportedObjects[0].attributes[ATTRIBUTE_TITLE_KEY]).toBe(
        `${ATTRIBUTE_TITLE_VALUE} in ${SPACES.SPACE_1.spaceId}`
      );

      const export2 = await apiServices.savedObjects.export(
        { objects: [{ type: 'dashboard', id: objectId2 }] },
        SPACES.SPACE_2.spaceId
      );

      expect(export2.status).toBe(200);
      expect(export2.data.exportedObjects).toHaveLength(1);
      expect(export2.data.exportedObjects[0].attributes[ATTRIBUTE_TITLE_KEY]).toBe(
        `${ATTRIBUTE_TITLE_VALUE} in ${SPACES.SPACE_2.spaceId}`
      );

      // Cleanup
      await apiServices.savedObjects.delete('dashboard', objectId1, SPACES.SPACE_1.spaceId);
      await apiServices.savedObjects.delete('dashboard', objectId2, SPACES.SPACE_2.spaceId);
    }
  );

  apiTest(
    'createNewCopies should create separate objects in different spaces',
    async ({ apiServices }) => {
      const objectId = `new-copies-${Date.now()}`;

      // Import with createNewCopies to space_1
      const response1 = await apiServices.savedObjects.import(
        {
          objects: [
            {
              type: 'dashboard',
              id: objectId,
              attributes: { [ATTRIBUTE_TITLE_KEY]: 'Copy in Space 1' },
            },
          ],
          createNewCopies: true,
        },
        SPACES.SPACE_1.spaceId
      );

      expect(response1.status).toBe(200);
      expect(response1.data.success).toBe(true);
      expect(response1.data.successResults).toBeDefined();
      const newId1 = response1.data.successResults![0].destinationId;
      expect(newId1).toBeDefined();
      expect(newId1).toMatch(/^[0-9a-f-]{36}$/); // UUID format

      // Import with createNewCopies to space_2 (same original ID)
      const response2 = await apiServices.savedObjects.import(
        {
          objects: [
            {
              type: 'dashboard',
              id: objectId,
              attributes: { [ATTRIBUTE_TITLE_KEY]: 'Copy in Space 2' },
            },
          ],
          createNewCopies: true,
        },
        SPACES.SPACE_2.spaceId
      );

      expect(response2.status).toBe(200);
      expect(response2.data.success).toBe(true);
      expect(response2.data.successResults).toBeDefined();
      const newId2 = response2.data.successResults![0].destinationId;
      expect(newId2).toBeDefined();
      expect(newId2).toMatch(/^[0-9a-f-]{36}$/); // UUID format

      // The two generated IDs should be different
      expect(newId1).not.toBe(newId2);

      // Verify both objects exist in their respective spaces
      const export1 = await apiServices.savedObjects.export(
        { objects: [{ type: 'dashboard', id: newId1! }] },
        SPACES.SPACE_1.spaceId
      );
      expect(export1.status).toBe(200);
      expect(export1.data.exportedObjects).toHaveLength(1);

      const export2 = await apiServices.savedObjects.export(
        { objects: [{ type: 'dashboard', id: newId2! }] },
        SPACES.SPACE_2.spaceId
      );
      expect(export2.status).toBe(200);
      expect(export2.data.exportedObjects).toHaveLength(1);

      // Cleanup
      await apiServices.savedObjects.delete('dashboard', newId1!, SPACES.SPACE_1.spaceId);
      await apiServices.savedObjects.delete('dashboard', newId2!, SPACES.SPACE_2.spaceId);
    }
  );
});

// TODO
// cover scenarios highlighted here:
// https://www.elastic.co/docs/explore-analyze/find-and-organize/saved-objects#saved-object-ids-impact-when-using-import-and-copy
// * 2. Multi-namespace objects: Should be shareable across spaces (TODO: requires index-pattern or sharedtype)
// * 3. Namespace-agnostic objects: Should conflict globally across all spaces (TODO: requires globaltype)
