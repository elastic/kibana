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
  objectPath,
  setupAccessControlUsers,
  SIMPLE_USER_PASSWORD,
  SIMPLE_USER_USERNAME,
  TEST_USER_PASSWORD,
  TEST_USER_USERNAME,
  withXsrf,
} from '../common/access_control';

apiTest.describe('spaces access control - #delete', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ esClient, kbnClient }) => {
    await setupAccessControlUsers({ esClient, kbnClient });
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    await cleanupAccessControlObjects(kbnClient, log);
  });

  apiTest('allow owner to delete object marked as write-restricted', async ({ apiClient }) => {
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
    expect(createResponse.body.accessControl.owner).toBe(profileUid);

    const deleteResponse = await apiClient.delete(objectPath(objectId), {
      headers: withXsrf(cookieHeader),
    });
    expect(deleteResponse).toHaveStatusCode(200);
  });

  apiTest(
    'allows admin to delete object marked as write-restricted',
    async ({ apiClient, config }) => {
      const { cookieHeader: ownerCookie, profileUid } = await loginAsObjectOwner(
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
      expect(createResponse.body.accessControl.owner).toBe(profileUid);

      const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
      const deleteResponse = await apiClient.delete(objectPath(objectId), {
        headers: withXsrf(adminCookie),
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const getResponse = await apiClient.get(objectPath(objectId), {
        headers: withXsrf(adminCookie),
      });
      expect(getResponse).toHaveStatusCode(404);
      expect(getResponse.body.message).toContain(
        `Saved object [${ACCESS_CONTROL_TYPE}/${objectId}] not found`
      );
    }
  );

  apiTest(
    'throws when trying to delete write-restricted object owned by a different user when not admin',
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
      expect(createResponse.body.accessControl.owner).toBe(adminProfileUid);

      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        ACCESS_CONTROL_EDITOR_USERNAME,
        ACCESS_CONTROL_EDITOR_PASSWORD
      );
      const deleteResponse = await apiClient.delete(objectPath(objectId), {
        headers: withXsrf(notOwnerCookie),
      });
      expect(deleteResponse).toHaveStatusCode(403);
      expect(deleteResponse.body.message).toContain(`Unable to delete ${ACCESS_CONTROL_TYPE}`);
    }
  );

  apiTest('allows non-owner to delete object in default mode', async ({ apiClient, config }) => {
    const { cookieHeader: ownerCookie } = await loginAsKibanaAdmin(apiClient, config);
    const createResponse = await apiClient.post(CREATE_PATH, {
      headers: withXsrf(ownerCookie),
      body: { type: ACCESS_CONTROL_TYPE },
    });
    expect(createResponse).toHaveStatusCode(200);
    const objectId = createResponse.body.id;

    const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const deleteResponse = await apiClient.delete(objectPath(objectId), {
      headers: withXsrf(notOwnerCookie),
    });
    expect(deleteResponse).toHaveStatusCode(200);
  });

  apiTest(
    'throws when trying to delete write-restricted object by owner with revoked RBAC privileges',
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
      expect(createResponse.body.accessControl.owner).toBe(ownerProfileUid);

      // revoke privileges
      await createSimpleUser(esClient, ['viewer']);

      const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
      const getResponse = await apiClient.get(objectPath(objectId), {
        headers: withXsrf(adminCookie),
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.accessControl.owner).toBe(ownerProfileUid);

      const { cookieHeader: revokedCookie, profileUid: revokedProfileUid } =
        await loginAsObjectOwner(apiClient, SIMPLE_USER_USERNAME, SIMPLE_USER_PASSWORD);
      expect(ownerProfileUid).toBe(revokedProfileUid);

      const deleteResponse = await apiClient.delete(objectPath(objectId), {
        headers: withXsrf(revokedCookie),
      });
      expect(deleteResponse).toHaveStatusCode(403);
      expect(deleteResponse.body.message).toContain(`Unable to delete ${ACCESS_CONTROL_TYPE}`);
    }
  );
});
