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
  activateSimpleUserProfile,
  adminBasicAuthHeader,
  CHANGE_OWNER_PATH,
  cleanupAccessControlObjects,
  CREATE_PATH,
  createSimpleUser,
  loginAsKibanaAdmin,
  loginAsNotObjectOwner,
  loginAsObjectOwner,
  NON_ACCESS_CONTROL_TYPE,
  objectPath,
  setupAccessControlUsers,
  SIMPLE_USER_PASSWORD,
  SIMPLE_USER_USERNAME,
  TEST_USER_PASSWORD,
  TEST_USER_USERNAME,
  withXsrf,
} from '../common/access_control';

apiTest.describe(
  'spaces access control - #change_ownership',
  { tag: tags.stateful.classic },
  () => {
    apiTest.beforeAll(async ({ esClient, kbnClient }) => {
      await setupAccessControlUsers({ esClient, kbnClient });
    });

    apiTest.afterAll(async ({ kbnClient, log }) => {
      await cleanupAccessControlObjects(kbnClient, log);
    });

    apiTest(
      'should transfer ownership of write-restricted objects by owner',
      async ({ apiClient, esClient }) => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(esClient);
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

        const transferResponse = await apiClient.put(CHANGE_OWNER_PATH, {
          headers: withXsrf(ownerCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newOwnerProfileUid: simpleUserProfileUid,
          },
        });
        expect(transferResponse).toHaveStatusCode(200);

        const getResponse = await apiClient.get(objectPath(objectId), {
          headers: withXsrf(ownerCookie),
        });
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.accessControl.owner).toBe(simpleUserProfileUid);
      }
    );

    apiTest(
      'should throw when transferring ownership of object owned by a different user and not admin',
      async ({ apiClient, esClient, config }) => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(esClient);
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
        const transferResponse = await apiClient.put(CHANGE_OWNER_PATH, {
          headers: withXsrf(notOwnerCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newOwnerProfileUid: simpleUserProfileUid,
          },
        });
        expect(transferResponse).toHaveStatusCode(403);
        expect(transferResponse.body.message).toContain(
          `Access denied: Unable to manage access control for objects ${ACCESS_CONTROL_TYPE}:${objectId}`
        );
      }
    );

    apiTest(
      'should allow admins to transfer ownership of any object',
      async ({ apiClient, esClient, config }) => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(esClient);
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
        const transferResponse = await apiClient.put(CHANGE_OWNER_PATH, {
          headers: withXsrf(adminCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newOwnerProfileUid: simpleUserProfileUid,
          },
        });
        expect(transferResponse).toHaveStatusCode(200);

        const getResponse = await apiClient.get(objectPath(objectId), {
          headers: withXsrf(adminCookie),
        });
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.accessControl.owner).toBe(simpleUserProfileUid);
      }
    );

    apiTest(
      'should allow bulk transfer ownership of allowed objects',
      async ({ apiClient, esClient, config }) => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(esClient);
        const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
          apiClient,
          TEST_USER_USERNAME,
          TEST_USER_PASSWORD
        );
        const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);

        const firstCreate = await apiClient.post(CREATE_PATH, {
          headers: withXsrf(ownerCookie),
          body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
        });
        expect(firstCreate).toHaveStatusCode(200);
        const firstObjectId = firstCreate.body.id;

        const secondCreate = await apiClient.post(CREATE_PATH, {
          headers: withXsrf(ownerCookie),
          body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
        });
        expect(secondCreate).toHaveStatusCode(200);
        const secondObjectId = secondCreate.body.id;

        const transferResponse = await apiClient.put(CHANGE_OWNER_PATH, {
          headers: withXsrf(ownerCookie),
          body: {
            objects: [
              { id: firstObjectId, type: firstCreate.body.type },
              { id: secondObjectId, type: secondCreate.body.type },
            ],
            newOwnerProfileUid: simpleUserProfileUid,
          },
        });
        expect(transferResponse).toHaveStatusCode(200);

        const getFirst = await apiClient.get(objectPath(firstObjectId), {
          headers: withXsrf(adminCookie),
        });
        expect(getFirst).toHaveStatusCode(200);
        expect(getFirst.body.accessControl.owner).toBe(simpleUserProfileUid);

        const getSecond = await apiClient.get(objectPath(secondObjectId), {
          headers: withXsrf(adminCookie),
        });
        expect(getSecond).toHaveStatusCode(200);
        expect(getSecond.body.accessControl.owner).toBe(simpleUserProfileUid);
      }
    );

    apiTest(
      'sets the default mode when setting the ownership of an object without access control metadata',
      async ({ apiClient, esClient, config }) => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(esClient);

        const createResponse = await apiClient.post(CREATE_PATH, {
          headers: withXsrf(adminBasicAuthHeader(config)),
          body: { type: ACCESS_CONTROL_TYPE },
        });
        expect(createResponse).toHaveStatusCode(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).toBeUndefined();

        const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
        const getBefore = await apiClient.get(objectPath(objectId), {
          headers: withXsrf(adminCookie),
        });
        expect(getBefore).toHaveStatusCode(200);
        expect(getBefore.body.accessControl).toBeUndefined();

        const transferResponse = await apiClient.put(CHANGE_OWNER_PATH, {
          headers: withXsrf(adminCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newOwnerProfileUid: simpleUserProfileUid,
          },
        });
        expect(transferResponse).toHaveStatusCode(200);

        const getAfter = await apiClient.get(objectPath(objectId), {
          headers: withXsrf(adminCookie),
        });
        expect(getAfter).toHaveStatusCode(200);
        expect(getAfter.body.accessControl.owner).toBe(simpleUserProfileUid);
        expect(getAfter.body.accessControl.accessMode).toBe('default');
      }
    );

    apiTest(
      'should throw when transferring ownership of write-restricted objects if owner RBAC privileges are revoked',
      async ({ apiClient, esClient, config }) => {
        const { cookieHeader: testUserCookie, profileUid: testUserProfileUid } =
          await loginAsObjectOwner(apiClient, TEST_USER_USERNAME, TEST_USER_PASSWORD);

        await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
        const { cookieHeader: ownerCookie, profileUid: ownerProfileUid } =
          await loginAsNotObjectOwner(apiClient, SIMPLE_USER_USERNAME, SIMPLE_USER_PASSWORD);

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

        const transferResponse = await apiClient.put(CHANGE_OWNER_PATH, {
          headers: withXsrf(revokedCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newOwnerProfileUid: testUserProfileUid,
          },
        });
        expect(transferResponse).toHaveStatusCode(403);

        const getAfter = await apiClient.get(objectPath(objectId), {
          headers: withXsrf(testUserCookie),
        });
        expect(getAfter).toHaveStatusCode(200);
        expect(getAfter.body.accessControl.owner).toBe(ownerProfileUid);
      }
    );

    apiTest(
      'partial bulk change ownership transfers allowed objects and reports unsupported types',
      async ({ apiClient, esClient }) => {
        const { profileUid: simpleUserProfileUid } = await activateSimpleUserProfile(esClient);
        const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
          apiClient,
          TEST_USER_USERNAME,
          TEST_USER_PASSWORD
        );
        const firstCreate = await apiClient.post(CREATE_PATH, {
          headers: withXsrf(ownerCookie),
          body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
        });
        expect(firstCreate).toHaveStatusCode(200);
        const firstObjectId = firstCreate.body.id;

        const secondCreate = await apiClient.post(CREATE_PATH, {
          headers: withXsrf(ownerCookie),
          body: { type: NON_ACCESS_CONTROL_TYPE },
        });
        expect(secondCreate).toHaveStatusCode(200);
        const secondObjectId = secondCreate.body.id;

        const transferResponse = await apiClient.put(CHANGE_OWNER_PATH, {
          headers: withXsrf(ownerCookie),
          body: {
            objects: [
              { id: firstObjectId, type: firstCreate.body.type },
              { id: secondObjectId, type: secondCreate.body.type },
            ],
            newOwnerProfileUid: simpleUserProfileUid,
          },
        });
        expect(transferResponse).toHaveStatusCode(200);
        expect(transferResponse.body.objects).toHaveLength(2);

        const accessControlObject = transferResponse.body.objects.find(
          (object: { type: string }) => object.type === ACCESS_CONTROL_TYPE
        );
        const nonAccessControlObject = transferResponse.body.objects.find(
          (object: { type: string }) => object.type === NON_ACCESS_CONTROL_TYPE
        );
        expect(accessControlObject).toBeDefined();
        expect(nonAccessControlObject).toBeDefined();

        expect(accessControlObject.id).toBe(firstObjectId);
        expect(nonAccessControlObject.id).toBe(secondObjectId);
        expect(nonAccessControlObject.error.output.payload.message).toContain(
          `The type ${NON_ACCESS_CONTROL_TYPE} does not support access control: Bad Request`
        );
      }
    );
  }
);
