/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  ACCESS_CONTROL_EDITOR_PASSWORD,
  ACCESS_CONTROL_EDITOR_USERNAME,
  ACCESS_CONTROL_TYPE,
  cleanupAccessControlObjects,
  CREATE_PATH,
  createSimpleUser,
  loginAsKibanaAdmin,
  loginAsNotObjectOwner,
  loginAsObjectOwner,
  setupAccessControlUsers,
  SIMPLE_USER_PASSWORD,
  SIMPLE_USER_USERNAME,
  TEST_USER_PASSWORD,
  TEST_USER_USERNAME,
  UPDATE_PATH,
  withXsrf,
} from '../common/access_control';

apiTest.describe('spaces access control - #update', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ esClient, kbnClient }) => {
    await setupAccessControlUsers({ esClient, kbnClient });
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    await cleanupAccessControlObjects(kbnClient, log);
  });

  apiTest(
    'should update write-restricted objects owned by the same user',
    async ({ apiClient }) => {
      const { cookieHeader, profileUid } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const createResponse = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(cookieHeader),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(createResponse).toHaveStatusCode(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.attributes.description).toBe('test');
      expect(createResponse.body.accessControl.accessMode).toBe('write_restricted');
      expect(createResponse.body.accessControl.owner).toBe(profileUid);

      const updateResponse = await apiClient.put(UPDATE_PATH, {
        headers: withXsrf(cookieHeader),
        body: { objectId, type: ACCESS_CONTROL_TYPE },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body.id).toBe(objectId);
      expect(updateResponse.body.attributes.description).toBe('updated description');
    }
  );

  apiTest(
    'should throw when updating write-restricted objects owned by a different user when not admin',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
        apiClient,
        config
      );
      const createResponse = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(createResponse).toHaveStatusCode(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.attributes.description).toBe('test');
      expect(createResponse.body.accessControl.accessMode).toBe('write_restricted');
      expect(createResponse.body.accessControl.owner).toBe(adminProfileUid);

      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        ACCESS_CONTROL_EDITOR_USERNAME,
        ACCESS_CONTROL_EDITOR_PASSWORD
      );
      const updateResponse = await apiClient.put(UPDATE_PATH, {
        headers: withXsrf(notOwnerCookie),
        body: { objectId, type: ACCESS_CONTROL_TYPE },
      });
      expect(updateResponse).toHaveStatusCode(403);
      expect(updateResponse.body.message).toContain(`Unable to update ${ACCESS_CONTROL_TYPE}`);
    }
  );

  apiTest(
    'objects with default accessMode can be modified by non-owners',
    async ({ apiClient, esClient, config }) => {
      const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
      const response = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE },
      });
      expect(response).toHaveStatusCode(200);
      const objectId = response.body.id;

      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const updateResponse = await apiClient.put(UPDATE_PATH, {
        headers: withXsrf(notOwnerCookie),
        body: { objectId, type: ACCESS_CONTROL_TYPE },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body.id).toBe(objectId);
      expect(updateResponse.body.attributes.description).toBe('updated description');
    }
  );

  apiTest(
    'allows admin to update objects owned by different user',
    async ({ apiClient, config }) => {
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const createResponse = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(ownerCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(createResponse).toHaveStatusCode(200);
      const objectId = createResponse.body.id;

      const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
      const updateResponse = await apiClient.put(UPDATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { objectId, type: ACCESS_CONTROL_TYPE },
      });
      expect(updateResponse).toHaveStatusCode(200);
      expect(updateResponse.body.id).toBe(objectId);
      expect(updateResponse.body.attributes.description).toBe('updated description');
    }
  );

  apiTest(
    'should throw when updating write-restricted objects by owner with revoked RBAC privileges',
    async ({ apiClient, esClient, config }) => {
      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: ownerCookie, profileUid: ownerProfileUid } = await loginAsObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const createResponse = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(ownerCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(createResponse).toHaveStatusCode(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.attributes.description).toBe('test');
      expect(createResponse.body.accessControl.accessMode).toBe('write_restricted');
      expect(createResponse.body.accessControl.owner).toBe(ownerProfileUid);

      // revoke privileges
      await createSimpleUser(esClient, ['viewer']);

      const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
      const getResponse = await apiClient.get(`/access_control_objects/${objectId}`, {
        headers: withXsrf(adminCookie),
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.accessControl.owner).toBe(ownerProfileUid);

      const { cookieHeader: revokedCookie, profileUid: revokedProfileUid } =
        await loginAsObjectOwner(apiClient, SIMPLE_USER_USERNAME, SIMPLE_USER_PASSWORD);
      expect(ownerProfileUid).toBe(revokedProfileUid);

      const updateResponse = await apiClient.put(UPDATE_PATH, {
        headers: withXsrf(revokedCookie),
        body: { objectId, type: ACCESS_CONTROL_TYPE },
      });
      expect(updateResponse).toHaveStatusCode(403);
      expect(updateResponse.body.message).toContain(`Unable to update ${ACCESS_CONTROL_TYPE}`);
    }
  );
});
