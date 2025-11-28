/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, RequestAuthFixture, RoleApiCredentials, ScoutLogger } from '@kbn/scout';
import { apiTest, expect, tags } from '@kbn/scout';

import { ATTRIBUTE_TITLE_KEY, ATTRIBUTE_TITLE_VALUE, COMMON_HEADERS, SPACES } from './constants';
import { prepareImportFormData } from './helpers';

apiTest.describe(`_import API with multiple spaces`, { tag: tags.ESS_ONLY }, () => {
  // Note: since version 8.0, Kibana requires most saved objects to have globally unique IDs
  // Learn more: https://www.elastic.co/docs/explore-analyze/find-and-organize/saved-objects

  const spacesToCreate = [SPACES.SPACE_1, SPACES.SPACE_2];
  let savedObjectsManagementCredentials: RoleApiCredentials;
  let createdSavedObjects: Array<{ type: string; id: string; spaceId: string }>;

  const createApiKeyWithSavedObjectsManagementPrivileges = async (
    requestAuth: RequestAuthFixture
  ) => {
    return await requestAuth.getApiKeyForCustomRole({
      elasticsearch: {
        cluster: [],
        indices: [],
      },
      kibana: [
        {
          base: [],
          feature: {
            savedObjectsManagement: ['all'],
          },
          spaces: ['*'], // Access to all spaces
        },
      ],
    });
  };

  const createSpaces = async (kbnClient: KbnClient, log: ScoutLogger) => {
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
  };

  apiTest.beforeAll(async ({ kbnClient, log, requestAuth }) => {
    await createSpaces(kbnClient, log);
    savedObjectsManagementCredentials = await createApiKeyWithSavedObjectsManagementPrivileges(
      requestAuth
    );
  });

  apiTest.beforeEach(() => {
    createdSavedObjects = [];
  });

  apiTest.afterEach(async ({ apiServices, log }) => {
    // Cleanup created objects in each space
    if (createdSavedObjects.length > 0) {
      for (const { type, id, spaceId } of createdSavedObjects) {
        try {
          await apiServices.savedObjects.delete(type, id, spaceId);
          log.debug(`Cleaned up ${type}:${id} in space [${spaceId}]`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          log.error(`Error cleaning up ${type}:${id} in space [${spaceId}]: ${errorMessage}`);
        }
      }
    }
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    // Delete created spaces
    await Promise.all(
      spacesToCreate.map(async (space) => {
        await kbnClient.spaces.delete(space.spaceId);
        log.info(`Deleted space [${space.spaceId}] after multi-space test suite`);
      })
    );
  });

  apiTest(
    'should import and export saved objects across different spaces',
    async ({ apiClient, apiServices }) => {
      const objectId1 = `dashboard-id-1-space1`;
      const objectId2 = `dashboard-id-2-space2`;

      const formData1 = prepareImportFormData([
        {
          type: 'dashboard',
          id: objectId1,
          attributes: {
            [ATTRIBUTE_TITLE_KEY]: `${ATTRIBUTE_TITLE_VALUE} in ${SPACES.SPACE_1.spaceId}`,
          },
        },
      ]);

      const importResponse1 = await apiClient.post(
        `s/${SPACES.SPACE_1.spaceId}/api/saved_objects/_import?overwrite=false`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...savedObjectsManagementCredentials.apiKeyHeader,
            ...formData1.headers,
          },
          body: formData1.buffer,
        }
      );
      createdSavedObjects.push({
        type: 'dashboard',
        id: objectId1,
        spaceId: SPACES.SPACE_1.spaceId,
      });

      expect(importResponse1.statusCode).toBe(200);
      expect(importResponse1.body.success).toBe(true);
      expect(importResponse1.body.successCount).toBe(1);

      const formData2 = prepareImportFormData([
        {
          type: 'dashboard',
          id: objectId2,
          attributes: {
            [ATTRIBUTE_TITLE_KEY]: `${ATTRIBUTE_TITLE_VALUE} in ${SPACES.SPACE_2.spaceId}`,
          },
        },
      ]);

      const importResponse2 = await apiClient.post(
        `s/${SPACES.SPACE_2.spaceId}/api/saved_objects/_import?overwrite=false`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...savedObjectsManagementCredentials.apiKeyHeader,
            ...formData2.headers,
          },
          body: formData2.buffer,
        }
      );
      createdSavedObjects.push({
        type: 'dashboard',
        id: objectId2,
        spaceId: SPACES.SPACE_2.spaceId,
      });

      expect(importResponse2.statusCode).toBe(200);
      expect(importResponse2.body.success).toBe(true);
      expect(importResponse2.body.successCount).toBe(1);

      // Verify objects exist in their respective spaces using apiServices (verification/teardown)
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
    }
  );

  apiTest(
    'should import a dashboard object in space 1 and then import the same object in space 2 but with a new ID',
    async ({ apiClient, apiServices }) => {
      const uniqueId = `unique-dashboard-id`;

      // Import dashboard with a specific ID to space_1 - should succeed
      const formData1 = prepareImportFormData([
        {
          type: 'dashboard',
          id: uniqueId,
          attributes: {
            [ATTRIBUTE_TITLE_KEY]: `${ATTRIBUTE_TITLE_VALUE} in Space 1`,
          },
        },
      ]);

      const importResponse1 = await apiClient.post(
        `s/${SPACES.SPACE_1.spaceId}/api/saved_objects/_import?overwrite=false`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...savedObjectsManagementCredentials.apiKeyHeader,
            ...formData1.headers,
          },
          body: formData1.buffer,
        }
      );
      createdSavedObjects.push({
        type: 'dashboard',
        id: uniqueId,
        spaceId: SPACES.SPACE_1.spaceId,
      });

      expect(importResponse1.statusCode).toBe(200);
      expect(importResponse1.body.success).toBe(true);
      expect(importResponse1.body.successCount).toBe(1);

      // Attempt to import dashboard with the SAME ID to space_2 - should create a saved object with a new ID
      const formData2 = prepareImportFormData([
        {
          type: 'dashboard',
          id: uniqueId,
          attributes: {
            [ATTRIBUTE_TITLE_KEY]: `${ATTRIBUTE_TITLE_VALUE} in Space 2`,
          },
        },
      ]);

      const importResponse2 = await apiClient.post(
        `s/${SPACES.SPACE_2.spaceId}/api/saved_objects/_import?overwrite=false`,
        {
          headers: {
            ...COMMON_HEADERS,
            ...savedObjectsManagementCredentials.apiKeyHeader,
            ...formData2.headers,
          },
          body: formData2.buffer,
        }
      );

      expect(importResponse2.statusCode).toBe(200);
      expect(importResponse2.body.success).toBe(true);
      expect(importResponse2.body.successCount).toBe(1);
      expect(importResponse2.body.successResults[0].id).toBe(uniqueId);

      const newID = importResponse2.body.successResults[0].destinationId;
      createdSavedObjects.push({ type: 'dashboard', id: newID, spaceId: SPACES.SPACE_2.spaceId });

      // Verify that a new ID was generated
      expect(newID).not.toBe(uniqueId);

      const exportResponse = await apiServices.savedObjects.export(
        { objects: [{ type: 'dashboard', id: newID }] },
        SPACES.SPACE_2.spaceId
      );

      expect(exportResponse.status).toBe(200);

      // Import should succeed and the object should exist in space 2 with the new ID
      expect(importResponse2.statusCode).toBe(200);
      expect(importResponse2.body.success).toBe(true);
      expect(exportResponse.data.exportedObjects).toHaveLength(1);
      expect(exportResponse.data.exportedObjects[0].attributes[ATTRIBUTE_TITLE_KEY]).toBe(
        `${ATTRIBUTE_TITLE_VALUE} in Space 2`
      );
    }
  );
});

// TODO
// cover scenarios highlighted here:
// https://www.elastic.co/docs/explore-analyze/find-and-organize/saved-objects#saved-object-ids-impact-when-using-import-and-copy
// * 2. Multi-namespace objects: Should be shareable across spaces (TODO: requires index-pattern or sharedtype)
// * 3. Namespace-agnostic objects: Should conflict globally across all spaces (TODO: requires globaltype)
