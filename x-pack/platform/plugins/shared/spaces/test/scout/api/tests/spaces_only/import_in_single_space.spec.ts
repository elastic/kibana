/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  ATTRIBUTE_TITLE_KEY,
  ATTRIBUTE_TITLE_VALUE,
  COMMON_HEADERS,
  DASHBOARD_SAVED_OBJECT,
  SPACES,
  TEST_SPACES,
} from '../../constants';
import { apiTest } from '../../fixtures';
import { prepareImportFormData } from '../../helpers';

/**
 * Tests for the Saved Objects Import API (_import) within individual spaces (default space and a "space_1" space).
 *
 * This test suite validates import behavior when operating within a single space at a time to ensure
 * consistent behavior regardless of the space context. The test suite uses an API key with minimal 'savedObjectsManagement' privileges to ensure
 * proper role-based access control.
 *
 * Note: since version 8.0, Kibana requires most saved objects to have globally unique IDs
 * Learn more: https://www.elastic.co/docs/explore-analyze/find-and-organize/saved-objects
 */
TEST_SPACES.forEach((space) => {
  const spacePath = space.spaceId === 'default' ? '' : `s/${space.spaceId}/`;

  apiTest.describe(`_import API within the ${space.name} space`, { tag: tags.stateful.all }, () => {
    let savedObjectsManagementCredentials: RoleApiCredentials;

    apiTest.beforeAll(async ({ kbnClient, log, requestAuth }) => {
      // Create the space (skip for default which always exists)
      if (space.spaceId !== SPACES.DEFAULT.spaceId) {
        log.debug(`Creating space [${space.spaceId}] for test suite`);
        await kbnClient.spaces.create({
          id: space.spaceId,
          name: space.name,
          description: space.description,
          disabledFeatures: [...space.disabledFeatures],
        });
      } else {
        log.debug(`Using default space for test suite`);
      }

      savedObjectsManagementCredentials = await requestAuth.getSavedObjectsManagementApiKey();
    });

    apiTest.afterEach(async ({ kbnClient, log }) => {
      await kbnClient.savedObjects.clean({ space: space.spaceId, types: ['dashboard'] });
      log.debug(`Cleaned up saved objects in space [${space.spaceId}] after test`);
    });

    apiTest.afterAll(async ({ kbnClient, log }) => {
      // Delete the space (skip for default)
      if (space.spaceId !== SPACES.DEFAULT.spaceId) {
        await kbnClient.spaces.delete(space.spaceId);
        log.debug(`Deleted space [${space.spaceId}] after test suite`);
      }
    });

    apiTest(
      'should return 409 when trying to create dashboard that already exists when overwrite=false',
      async ({ apiClient }) => {
        const uniqueId = `dashboard-${Date.now()}-${space.spaceId}`;

        // First import should succeed
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
              ...savedObjectsManagementCredentials.apiKeyHeader,
              ...formData1.headers,
            },
            body: formData1.buffer,
          }
        );

        expect(response1).toHaveStatusCode(200);
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
              ...savedObjectsManagementCredentials.apiKeyHeader,
              ...formData2.headers,
            },
            body: formData2.buffer,
          }
        );

        expect(response2).toHaveStatusCode(200);
        expect(response2.body.success).toBe(false);
        expect(response2.body.errors).toHaveLength(1);
        expect(response2.body.errors[0].error.type).toBe('conflict');
      }
    );

    apiTest(
      'should return 200 and override existing dashboard when importing a dashboard that already exists when overwrite=true',
      async ({ apiClient, kbnClient }) => {
        const uniqueId = `dashboard-${Date.now()}-${space.spaceId}`;

        // First import should succeed
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
              ...savedObjectsManagementCredentials.apiKeyHeader,
              ...formData1.headers,
            },
            body: formData1.buffer,
          }
        );

        expect(response1).toHaveStatusCode(200);
        expect(response1.body.success).toBe(true);
        expect(response1.body.successCount).toBe(1);

        // Second import without overwrite should fail with conflict
        const formData2 = prepareImportFormData([
          {
            ...DASHBOARD_SAVED_OBJECT,
            id: uniqueId,
            attributes: { title: `${ATTRIBUTE_TITLE_VALUE} - Overwritten` },
          },
        ]);

        const response2 = await apiClient.post(
          `${spacePath}api/saved_objects/_import?overwrite=true`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...savedObjectsManagementCredentials.apiKeyHeader,
              ...formData2.headers,
            },
            body: formData2.buffer,
          }
        );

        expect(response2).toHaveStatusCode(200);
        expect(response2.body.success).toBe(true);

        const getResponse = await kbnClient.savedObjects.get({
          type: 'dashboard',
          id: uniqueId,
          space: space.spaceId,
        });

        expect(getResponse.attributes[ATTRIBUTE_TITLE_KEY]).toBe(
          `${ATTRIBUTE_TITLE_VALUE} - Overwritten`
        );
      }
    );

    apiTest(
      'should return 200 and create a copy of the imported saved object (with a new ID) when createNewCopies=true',
      async ({ apiClient, kbnClient }) => {
        const uniqueId = `dashboard-overwrite-${Date.now()}-${space.spaceId}`;

        const formData1 = prepareImportFormData([
          {
            ...DASHBOARD_SAVED_OBJECT,
            id: uniqueId,
          },
        ]);

        const response1 = await apiClient.post(
          `${spacePath}api/saved_objects/_import?createNewCopies=true`,
          {
            headers: {
              ...COMMON_HEADERS,
              ...savedObjectsManagementCredentials.apiKeyHeader,
              ...formData1.headers,
            },
            body: formData1.buffer,
          }
        );

        expect(response1).toHaveStatusCode(200);
        expect(response1.body.success).toBe(true);
        expect(response1.body.successCount).toBe(1);
        expect(response1.body.successResults[0].id).toBe(uniqueId);

        const newID = response1.body.successResults[0].destinationId;

        // Verify that a new ID was generated
        expect(newID).not.toBe(uniqueId);

        const exportResponse = await kbnClient.savedObjects.get({
          type: 'dashboard',
          id: newID,
          space: space.spaceId,
        });

        // the copy does not have the originId set since it was created as a new object
        expect((exportResponse as any).originId).toBeUndefined();
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
            ...savedObjectsManagementCredentials.apiKeyHeader,
            ...formData.headers,
          },
          body: formData.buffer,
        }
      );

      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].error.type).toBe('unsupported_type');
    });
  });
});
