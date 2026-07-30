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
  adminBasicAuthHeader,
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
  withXsrf,
} from '../common/access_control';

apiTest.describe('spaces access control - #create', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ esClient, kbnClient }) => {
    await setupAccessControlUsers({ esClient, kbnClient });
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    await cleanupAccessControlObjects(kbnClient, log);
  });

  apiTest('should create a write-restricted object', async ({ apiClient, config }) => {
    const { cookieHeader, profileUid } = await loginAsKibanaAdmin(apiClient, config);
    const response = await apiClient.post(CREATE_PATH, {
      headers: withXsrf(cookieHeader),
      body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body.type).toBe(ACCESS_CONTROL_TYPE);
    expect(response.body.accessControl.accessMode).toBe('write_restricted');
    expect(response.body.accessControl.owner).toBe(profileUid);
  });

  apiTest(
    'creates objects that support access control without metadata when there is no active user profile',
    async ({ apiClient, config }) => {
      const response = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminBasicAuthHeader(config)),
        body: { type: ACCESS_CONTROL_TYPE },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.accessControl).toBeUndefined();
      expect(response.body.type).toBe(ACCESS_CONTROL_TYPE);

      const getResponse = await apiClient.get(`/access_control_objects/${response.body.id}`, {
        headers: withXsrf(adminBasicAuthHeader(config)),
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.accessControl).toBeUndefined();
    }
  );

  apiTest(
    'allows creating an object supporting access control with no metadata when there is no active user profile and no access mode is provided',
    async ({ apiClient, config }) => {
      const response = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminBasicAuthHeader(config)),
        body: { type: ACCESS_CONTROL_TYPE },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.accessControl).toBeUndefined();
      expect(response.body.type).toBe(ACCESS_CONTROL_TYPE);

      const createdId = response.body.id;
      const getResponse = await apiClient.get(`/access_control_objects/${createdId}`, {
        headers: withXsrf(adminBasicAuthHeader(config)),
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.accessControl).toBeUndefined();
      expect(getResponse.body.id).toBe(createdId);
      expect(getResponse.body.type).toBe(ACCESS_CONTROL_TYPE);
    }
  );

  apiTest(
    'should throw when trying to create an access control object with no user',
    async ({ apiClient, config }) => {
      const response = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminBasicAuthHeader(config)),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toContain(
        `Cannot create a saved object of type ${ACCESS_CONTROL_TYPE} with an access mode because Kibana could not determine the user profile ID for the caller. Access control requires an identifiable user profile: Bad Request`
      );
    }
  );

  apiTest('should allow overwriting an object owned by current user', async ({ apiClient }) => {
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

    const overwriteResponse = await apiClient.post(`${CREATE_PATH}?overwrite=true`, {
      headers: withXsrf(cookieHeader),
      body: { id: objectId, type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
    });
    expect(overwriteResponse).toHaveStatusCode(200);
    expect(overwriteResponse.body.id).toBe(objectId);
    expect(overwriteResponse.body.accessControl.accessMode).toBe('write_restricted');
    expect(overwriteResponse.body.accessControl.owner).toBe(profileUid);
  });

  apiTest(
    'should throw when overwriting an object owned by current user if RBAC privileges are revoked',
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

      const overwriteResponse = await apiClient.post(`${CREATE_PATH}?overwrite=true`, {
        headers: withXsrf(revokedCookie),
        body: { id: objectId, type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(overwriteResponse).toHaveStatusCode(403);
      expect(overwriteResponse.body.error).toBe('Forbidden');
      expect(overwriteResponse.body.message).toBe(`Unable to create ${ACCESS_CONTROL_TYPE}`);
    }
  );

  apiTest(
    'should allow overwriting an object owned by another user if admin',
    async ({ apiClient, config }) => {
      const { cookieHeader: ownerCookie, profileUid: ownerProfileUid } = await loginAsObjectOwner(
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
      expect(createResponse.body.attributes.description).toBe('test');
      expect(createResponse.body.accessControl.accessMode).toBe('write_restricted');
      expect(createResponse.body.accessControl.owner).toBe(ownerProfileUid);

      const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
      const overwriteResponse = await apiClient.post(`${CREATE_PATH}?overwrite=true`, {
        headers: withXsrf(adminCookie),
        body: { id: objectId, type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(overwriteResponse).toHaveStatusCode(200);
      expect(overwriteResponse.body.id).toBe(objectId);
      expect(overwriteResponse.body.accessControl.accessMode).toBe('write_restricted');
      expect(overwriteResponse.body.accessControl.owner).toBe(ownerProfileUid);
    }
  );

  apiTest(
    'should allow overwriting an object owned by another user if in default mode',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminUid } = await loginAsKibanaAdmin(
        apiClient,
        config
      );
      const createResponse = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: false },
      });
      expect(createResponse).toHaveStatusCode(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.attributes.description).toBe('test');
      expect(createResponse.body.accessControl.accessMode).toBe('default');
      expect(createResponse.body.accessControl.owner).toBe(adminUid);

      const { cookieHeader: otherUserCookie } = await loginAsNotObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const overwriteResponse = await apiClient.post(`${CREATE_PATH}?overwrite=true`, {
        headers: withXsrf(otherUserCookie),
        body: { id: objectId, type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(overwriteResponse).toHaveStatusCode(200);
      expect(overwriteResponse.body.id).toBe(objectId);
      // cannot overwrite the access mode of an object owned by another user
      expect(overwriteResponse.body.accessControl.accessMode).toBe('default');
      expect(overwriteResponse.body.accessControl.owner).toBe(adminUid);
    }
  );

  apiTest(
    'should reject overwriting an object owned by another user if not admin',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminUid } = await loginAsKibanaAdmin(
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
      expect(createResponse.body.accessControl.owner).toBe(adminUid);

      const { cookieHeader: otherOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        ACCESS_CONTROL_EDITOR_USERNAME,
        ACCESS_CONTROL_EDITOR_PASSWORD
      );
      const overwriteResponse = await apiClient.post(`${CREATE_PATH}?overwrite=true`, {
        headers: withXsrf(otherOwnerCookie),
        body: { id: objectId, type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(overwriteResponse).toHaveStatusCode(403);
      expect(overwriteResponse.body.error).toBe('Forbidden');
      expect(overwriteResponse.body.message).toContain(
        `The "manage_access_control" privilege is required to affect write restricted objects owned by another user.`
      );
      expect(overwriteResponse.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${objectId}`);
    }
  );
});
