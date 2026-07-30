/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  ACCESS_CONTROL_TYPE,
  activateSimpleUserProfile,
  adminBasicAuthHeader,
  CHANGE_MODE_PATH,
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
  UPDATE_PATH,
  withXsrf,
} from '../common/access_control';

apiTest.describe(
  'spaces access control - #change_access_mode',
  { tag: tags.stateful.classic },
  () => {
    apiTest.beforeAll(async ({ esClient, kbnClient }) => {
      await setupAccessControlUsers({ esClient, kbnClient });
    });

    apiTest.afterAll(async ({ kbnClient, log }) => {
      await cleanupAccessControlObjects(kbnClient, log);
    });

    apiTest(
      'should allow admins to change access mode of any object',
      async ({ apiClient, config }) => {
        const { cookieHeader: ownerCookie, profileUid } = await loginAsObjectOwner(
          apiClient,
          TEST_USER_USERNAME,
          TEST_USER_PASSWORD
        );
        const createResponse = await apiClient.post(CREATE_PATH, {
          headers: withXsrf(ownerCookie),
          body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: false },
        });
        expect(createResponse).toHaveStatusCode(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl.owner).toBe(profileUid);

        const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
        const response = await apiClient.put(CHANGE_MODE_PATH, {
          headers: withXsrf(adminCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newAccessMode: 'write_restricted',
          },
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.objects).toHaveLength(1);
        expect(response.body.objects[0].id).toBe(objectId);
        expect(response.body.objects[0].type).toBe(ACCESS_CONTROL_TYPE);

        const getResponse = await apiClient.get(objectPath(objectId), {
          headers: withXsrf(ownerCookie),
        });
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.accessControl.accessMode).toBe('write_restricted');
      }
    );

    apiTest(
      'allow owner to update object data after access mode change',
      async ({ apiClient, config }) => {
        const { cookieHeader: ownerCookie, profileUid } = await loginAsObjectOwner(
          apiClient,
          TEST_USER_USERNAME,
          TEST_USER_PASSWORD
        );
        const createResponse = await apiClient.post(CREATE_PATH, {
          headers: withXsrf(ownerCookie),
          body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: false },
        });
        expect(createResponse).toHaveStatusCode(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl.owner).toBe(profileUid);

        const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
        const response = await apiClient.put(CHANGE_MODE_PATH, {
          headers: withXsrf(ownerCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newAccessMode: 'write_restricted',
          },
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.objects).toHaveLength(1);
        expect(response.body.objects[0].id).toBe(objectId);
        expect(response.body.objects[0].type).toBe(ACCESS_CONTROL_TYPE);

        const getResponse = await apiClient.get(objectPath(objectId), {
          headers: withXsrf(adminCookie),
        });
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.accessControl.accessMode).toBe('write_restricted');

        const updateResponse = await apiClient.put(UPDATE_PATH, {
          headers: withXsrf(ownerCookie),
          body: { objectId, type: ACCESS_CONTROL_TYPE },
        });
        expect(updateResponse).toHaveStatusCode(200);
        expect(updateResponse.body.id).toBe(objectId);
        expect(updateResponse.body.attributes.description).toBe('updated description');
      }
    );

    apiTest(
      'should throw when trying to change access mode on write restricted objects when not owner',
      async ({ apiClient, esClient }) => {
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

        await activateSimpleUserProfile(esClient);
        // The non-owner runs with only the `viewer` role and still receives the
        // access-control 403 (not a generic RBAC denial).
        await createSimpleUser(esClient, ['viewer']);
        const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
          apiClient,
          SIMPLE_USER_USERNAME,
          SIMPLE_USER_PASSWORD
        );
        const updateResponse = await apiClient.put(CHANGE_MODE_PATH, {
          headers: withXsrf(notOwnerCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newAccessMode: 'write_restricted',
          },
        });
        expect(updateResponse).toHaveStatusCode(403);
        expect(updateResponse.body.message).toContain(
          `Access denied: Unable to manage access control for objects ${ACCESS_CONTROL_TYPE}:${objectId}`
        );
      }
    );

    apiTest(
      'allows updates by non-owner after removing write-restricted access mode',
      async ({ apiClient, esClient }) => {
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

        const changeModeResponse = await apiClient.put(CHANGE_MODE_PATH, {
          headers: withXsrf(ownerCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newAccessMode: 'default',
          },
        });
        expect(changeModeResponse).toHaveStatusCode(200);

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
      'sets the current user as the owner when setting the mode of an object without access control metadata',
      async ({ apiClient, config }) => {
        const createResponse = await apiClient.post(CREATE_PATH, {
          headers: withXsrf(adminBasicAuthHeader(config)),
          body: { type: ACCESS_CONTROL_TYPE },
        });
        expect(createResponse).toHaveStatusCode(200);
        const objectId = createResponse.body.id;
        expect(createResponse.body.accessControl).toBeUndefined();

        const { cookieHeader: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
          apiClient,
          config
        );
        const getBefore = await apiClient.get(objectPath(objectId), {
          headers: withXsrf(adminCookie),
        });
        expect(getBefore).toHaveStatusCode(200);
        expect(getBefore.body.accessControl).toBeUndefined();

        const changeModeResponse = await apiClient.put(CHANGE_MODE_PATH, {
          headers: withXsrf(adminCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newAccessMode: 'write_restricted',
          },
        });
        expect(changeModeResponse).toHaveStatusCode(200);

        const getAfter = await apiClient.get(objectPath(objectId), {
          headers: withXsrf(adminCookie),
        });
        expect(getAfter).toHaveStatusCode(200);
        expect(getAfter.body.accessControl.owner).toBe(adminProfileUid);
        expect(getAfter.body.accessControl.accessMode).toBe('write_restricted');
      }
    );

    apiTest(
      'should throw when trying to change access mode if owner RBAC privileges are revoked',
      async ({ apiClient, esClient, config }) => {
        const { cookieHeader: testUserCookie } = await loginAsObjectOwner(
          apiClient,
          TEST_USER_USERNAME,
          TEST_USER_PASSWORD
        );

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
        expect(createResponse.body.accessControl.accessMode).toBe('write_restricted');

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

        const changeModeResponse = await apiClient.put(CHANGE_MODE_PATH, {
          headers: withXsrf(revokedCookie),
          body: {
            objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
            newAccessMode: 'default',
          },
        });
        expect(changeModeResponse).toHaveStatusCode(403);

        const getAfter = await apiClient.get(objectPath(objectId), {
          headers: withXsrf(testUserCookie),
        });
        expect(getAfter).toHaveStatusCode(200);
        expect(getAfter.body.accessControl.accessMode).toBe('write_restricted');
      }
    );

    apiTest(
      'partial bulk change access mode of allowed objects and reports unsupported types',
      async ({ apiClient }) => {
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

        const setModeResponse = await apiClient.put(CHANGE_MODE_PATH, {
          headers: withXsrf(ownerCookie),
          body: {
            objects: [
              { id: firstObjectId, type: firstCreate.body.type },
              { id: secondObjectId, type: secondCreate.body.type },
            ],
            newAccessMode: 'default',
          },
        });
        expect(setModeResponse).toHaveStatusCode(200);
        expect(setModeResponse.body.objects).toHaveLength(2);

        const accessControlObject = setModeResponse.body.objects.find(
          (object: { type: string }) => object.type === ACCESS_CONTROL_TYPE
        );
        const nonAccessControlObject = setModeResponse.body.objects.find(
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
