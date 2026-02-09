/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the Saved Objects Import API (_import) with operations across multiple spaces.
 *
 * This test suite validates import behavior when working with saved objects across different
 * Kibana Spaces. The test suite uses an API key with minimal 'savedObjectsManagement' privileges to ensure
 * proper role-based access control.
 */

import type { KbnClient, RoleApiCredentials, ScoutLogger } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  ATTRIBUTE_TITLE_KEY,
  ATTRIBUTE_TITLE_VALUE,
  COMMON_HEADERS,
  SPACES,
} from '../../constants';
import { apiTest } from '../../fixtures';
import { prepareImportFormData } from '../../helpers';

apiTest.describe(`_import API with multiple spaces`, { tag: tags.ESS_ONLY }, () => {
  // Note: since version 8.0, Kibana requires most saved objects to have globally unique IDs
  // Learn more: https://www.elastic.co/docs/explore-analyze/find-and-organize/saved-objects

  const spacesToCreate = [SPACES.SPACE_1, SPACES.SPACE_2];
  let savedObjectsManagementCredentials: RoleApiCredentials;

  const createSpaces = async (kbnClient: KbnClient, log: ScoutLogger) => {
    await Promise.all(
      spacesToCreate.map(async (space) => {
        log.debug(`Creating ${space.spaceId} for multi-space test suite`);
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
    savedObjectsManagementCredentials = await requestAuth.getSavedObjectsManagementApiKey();
  });

  apiTest.afterEach(async ({ kbnClient, log }) => {
    await Promise.all(
      spacesToCreate.map(async (space) => {
        await kbnClient.savedObjects.clean({ space: space.spaceId, types: ['dashboard'] });
        log.debug(`Removed dashboards in space [${space.spaceId}] after test`);
      })
    );
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    // Delete created spaces
    await Promise.all(
      spacesToCreate.map(async (space) => {
        await kbnClient.spaces.delete(space.spaceId);
        log.debug(`Deleted space [${space.spaceId}] after multi-space test suite`);
      })
    );
  });

  apiTest(
    'should import and export saved objects across different spaces',
    async ({ apiClient, kbnClient }) => {
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

      expect(importResponse1).toHaveStatusCode(200);
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

      expect(importResponse2).toHaveStatusCode(200);
      expect(importResponse2.body.success).toBe(true);
      expect(importResponse2.body.successCount).toBe(1);

      // Verify objects exist in their respective spaces using kbnClient (verification/teardown)
      const export1 = await kbnClient.savedObjects.get({
        type: 'dashboard',
        id: objectId1,
        space: SPACES.SPACE_1.spaceId,
      });
      expect(export1.attributes[ATTRIBUTE_TITLE_KEY]).toBe(
        `${ATTRIBUTE_TITLE_VALUE} in ${SPACES.SPACE_1.spaceId}`
      );

      const export2 = await kbnClient.savedObjects.get({
        type: 'dashboard',
        id: objectId2,
        space: SPACES.SPACE_2.spaceId,
      });
      expect(export2.attributes[ATTRIBUTE_TITLE_KEY]).toBe(
        `${ATTRIBUTE_TITLE_VALUE} in ${SPACES.SPACE_2.spaceId}`
      );
    }
  );

  apiTest(
    'should import a dashboard object in space_1 and import the same object into space_2 but with a new destination ID',
    async ({ apiClient, kbnClient }) => {
      // Premise: if a saved object with the exact same ID exists in a different space, then Kibana will generate a random ID for the import destination
      // Learn more: https://www.elastic.co/docs/explore-analyze/find-and-organize/saved-objects#saved-objects-copy-to-other-spaces

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

      expect(importResponse1).toHaveStatusCode(200);
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

      expect(importResponse2).toHaveStatusCode(200);
      expect(importResponse2.body.success).toBe(true);
      expect(importResponse2.body.successCount).toBe(1);
      expect(importResponse2.body.successResults[0].id).toBe(uniqueId);

      const newID = importResponse2.body.successResults[0].destinationId;

      // Verify that a new ID was generated
      expect(newID).not.toBe(uniqueId);

      const exportResponse = await kbnClient.savedObjects.get({
        type: 'dashboard',
        id: newID,
        space: SPACES.SPACE_2.spaceId,
      });

      // Import should succeed and the object should exist in space 2 with the new ID
      expect(importResponse2).toHaveStatusCode(200);
      expect(importResponse2.body.success).toBe(true);

      // The originId should point to the original object's ID
      expect((exportResponse as any).originId).toBe(uniqueId);
      expect(exportResponse.attributes[ATTRIBUTE_TITLE_KEY]).toBe(
        `${ATTRIBUTE_TITLE_VALUE} in Space 2`
      );
    }
  );
});
