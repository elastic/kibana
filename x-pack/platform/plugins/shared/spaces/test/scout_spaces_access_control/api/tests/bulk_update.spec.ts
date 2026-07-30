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
  accessControlForbiddenError,
  activateSimpleUserProfile,
  BULK_UPDATE_PATH,
  cleanupAccessControlObjects,
  CREATE_PATH,
  createOwnedObject,
  createSimpleUser,
  loginAsKibanaAdmin,
  loginAsNotObjectOwner,
  loginAsObjectOwner,
  NON_ACCESS_CONTROL_TYPE,
  setupAccessControlUsers,
  SIMPLE_USER_PASSWORD,
  SIMPLE_USER_USERNAME,
  TEST_USER_PASSWORD,
  TEST_USER_USERNAME,
  withXsrf,
} from '../common/access_control';

const UPDATE_FORBIDDEN = accessControlForbiddenError('Updating');

apiTest.describe('spaces access control - #bulk_update', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ esClient, kbnClient }) => {
    await setupAccessControlUsers({ esClient, kbnClient });
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    await cleanupAccessControlObjects(kbnClient, log);
  });

  apiTest(
    'allows owner to bulk update objects marked as write restricted',
    async ({ apiClient }) => {
      const { cookieHeader, profileUid } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const first = await createOwnedObject(apiClient, cookieHeader, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: true,
      });
      const second = await createOwnedObject(apiClient, cookieHeader, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: true,
      });
      const objects = [
        { id: first.id, type: first.type },
        { id: second.id, type: second.type },
      ];

      const res = await apiClient.post(BULK_UPDATE_PATH, {
        headers: withXsrf(cookieHeader),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.saved_objects).toHaveLength(2);
      for (const { id, attributes, accessControl } of res.body.saved_objects) {
        expect(objects.find((obj) => obj.id === id)).toBeDefined();
        expect(attributes.description).toBe('updated description');
        expect(accessControl.owner).toBe(profileUid);
        expect(accessControl.accessMode).toBe('write_restricted');
      }
    }
  );

  apiTest(
    'allows admin to bulk update objects marked as write restricted',
    async ({ apiClient, config }) => {
      const { cookieHeader: ownerCookie, profileUid: ownerProfileUid } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const first = await createOwnedObject(apiClient, ownerCookie, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: true,
      });
      const second = await createOwnedObject(apiClient, ownerCookie, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: true,
      });
      const objects = [
        { id: first.id, type: first.type },
        { id: second.id, type: second.type },
      ];

      const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
      const res = await apiClient.post(BULK_UPDATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.saved_objects).toHaveLength(2);
      for (const { id, attributes, accessControl } of res.body.saved_objects) {
        expect(objects.find((obj) => obj.id === id)).toBeDefined();
        expect(attributes.description).toBe('updated description');
        expect(accessControl.owner).toBe(ownerProfileUid);
        expect(accessControl.accessMode).toBe('write_restricted');
      }
    }
  );

  apiTest(
    'allows non-owner non-admin to bulk update objects in default mode',
    async ({ apiClient, esClient }) => {
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const first = await createOwnedObject(apiClient, ownerCookie, {
        type: ACCESS_CONTROL_TYPE,
      });
      const second = await createOwnedObject(apiClient, ownerCookie, {
        type: ACCESS_CONTROL_TYPE,
      });
      const objects = [
        { id: first.id, type: first.type },
        { id: second.id, type: second.type },
      ];

      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const res = await apiClient.post(BULK_UPDATE_PATH, {
        headers: withXsrf(notOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.saved_objects).toHaveLength(2);
      for (const { id, attributes, accessControl } of res.body.saved_objects) {
        expect(objects.find((obj) => obj.id === id)).toBeDefined();
        expect(attributes.description).toBe('updated description');
        expect(accessControl.accessMode).toBe('default');
      }
    }
  );

  apiTest(
    'rejects if all objects are write-restricted and inaccessible',
    async ({ apiClient, esClient }) => {
      await activateSimpleUserProfile(esClient);
      // simple_user must be an editor (non-owner) to reach the access-control check rather than an RBAC denial.
      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const first = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(ownerCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const second = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(ownerCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const objectId1 = first.body.id;
      const objectId2 = second.body.id;
      const objects = [
        { id: objectId1, type: first.body.type },
        { id: objectId2, type: second.body.type },
      ];

      const { cookieHeader: nonOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const res = await apiClient.post(BULK_UPDATE_PATH, {
        headers: withXsrf(nonOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(403);
      expect(res.body.message).toContain(
        `Unable to bulk_update ${ACCESS_CONTROL_TYPE}. Access control restrictions for objects:`
      );
      expect(res.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${objectId1}`);
      expect(res.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${objectId2}`);
      expect(res.body.message).toContain(
        `The "manage_access_control" privilege is required to affect write restricted objects owned by another user.`
      );
    }
  );

  apiTest(
    'returns status if all objects are write-restricted but some are owned by the current user',
    async ({ apiClient, esClient }) => {
      await activateSimpleUserProfile(esClient);
      const { cookieHeader: object1OwnerCookie, profileUid: obj1OwnerId } =
        await loginAsObjectOwner(apiClient, TEST_USER_USERNAME, TEST_USER_PASSWORD);
      const first = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(object1OwnerCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const objectId1 = first.body.id;
      expect(first.body.accessControl.owner).toBe(obj1OwnerId);
      expect(first.body.accessControl.accessMode).toBe('write_restricted');

      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: object2OwnerCookie, profileUid: obj2OwnerId } =
        await loginAsNotObjectOwner(apiClient, SIMPLE_USER_USERNAME, SIMPLE_USER_PASSWORD);
      const second = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(object2OwnerCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const objectId2 = second.body.id;
      expect(second.body.accessControl.owner).toBe(obj2OwnerId);
      expect(second.body.accessControl.accessMode).toBe('write_restricted');

      const objects = [
        { id: objectId1, type: first.body.type },
        { id: objectId2, type: second.body.type },
      ];
      const res = await apiClient.post(BULK_UPDATE_PATH, {
        headers: withXsrf(object2OwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.saved_objects).toHaveLength(2);
      expect(res.body.saved_objects[0]).toStrictEqual({
        id: objectId1,
        type: ACCESS_CONTROL_TYPE,
        error: UPDATE_FORBIDDEN,
      });
      expect(res.body.saved_objects[1].id).toBe(objectId2);
      expect(res.body.saved_objects[1].type).toBe(second.body.type);
      expect(res.body.saved_objects[1].updated_by).toBe(obj2OwnerId);
      expect(res.body.saved_objects[1].error).toBeUndefined();
    }
  );

  apiTest('returns status if some objects are in default mode', async ({ apiClient, esClient }) => {
    await activateSimpleUserProfile(esClient);
    const { cookieHeader: object1OwnerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const first = await apiClient.post(CREATE_PATH, {
      headers: withXsrf(object1OwnerCookie),
      body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
    });
    const objectId1 = first.body.id;
    expect(first.body.accessControl.owner).toBe(obj1OwnerId);
    expect(first.body.accessControl.accessMode).toBe('write_restricted');

    const second = await apiClient.post(CREATE_PATH, {
      headers: withXsrf(object1OwnerCookie),
      body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: false },
    });
    const objectId2 = second.body.id;
    expect(second.body.accessControl.owner).toBe(obj1OwnerId);
    expect(second.body.accessControl.accessMode).toBe('default');

    await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
    const { cookieHeader: object2OwnerCookie, profileUid: obj2OwnerId } =
      await loginAsNotObjectOwner(apiClient, SIMPLE_USER_USERNAME, SIMPLE_USER_PASSWORD);

    const objects = [
      { id: objectId1, type: first.body.type },
      { id: objectId2, type: second.body.type },
    ];
    const res = await apiClient.post(BULK_UPDATE_PATH, {
      headers: withXsrf(object2OwnerCookie),
      body: { objects },
    });
    expect(res).toHaveStatusCode(200);
    expect(res.body.saved_objects).toHaveLength(2);
    expect(res.body.saved_objects[0]).toStrictEqual({
      id: objectId1,
      type: ACCESS_CONTROL_TYPE,
      error: UPDATE_FORBIDDEN,
    });
    expect(res.body.saved_objects[1].id).toBe(objectId2);
    expect(res.body.saved_objects[1].type).toBe(second.body.type);
    expect(res.body.saved_objects[1].updated_by).toBe(obj2OwnerId);
    expect(res.body.saved_objects[1].error).toBeUndefined();
  });

  apiTest(
    'returns status if some authorized types do not support access control',
    async ({ apiClient, esClient }) => {
      await activateSimpleUserProfile(esClient);
      const { cookieHeader: object1OwnerCookie, profileUid: obj1OwnerId } =
        await loginAsObjectOwner(apiClient, TEST_USER_USERNAME, TEST_USER_PASSWORD);
      const first = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(object1OwnerCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const objectId1 = first.body.id;
      expect(first.body.accessControl.owner).toBe(obj1OwnerId);
      expect(first.body.accessControl.accessMode).toBe('write_restricted');

      const second = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(object1OwnerCookie),
        body: { type: NON_ACCESS_CONTROL_TYPE },
      });
      const objectId2 = second.body.id;
      expect(second.body.accessControl).toBeUndefined();

      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: object2OwnerCookie, profileUid: obj2OwnerId } =
        await loginAsNotObjectOwner(apiClient, SIMPLE_USER_USERNAME, SIMPLE_USER_PASSWORD);

      const objects = [
        { id: objectId1, type: first.body.type },
        { id: objectId2, type: second.body.type },
      ];
      const res = await apiClient.post(BULK_UPDATE_PATH, {
        headers: withXsrf(object2OwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.saved_objects).toHaveLength(2);
      expect(res.body.saved_objects[0]).toStrictEqual({
        id: objectId1,
        type: ACCESS_CONTROL_TYPE,
        error: UPDATE_FORBIDDEN,
      });
      expect(res.body.saved_objects[1].id).toBe(objectId2);
      expect(res.body.saved_objects[1].type).toBe(second.body.type);
      expect(res.body.saved_objects[1].updated_by).toBe(obj2OwnerId);
      expect(res.body.saved_objects[1].error).toBeUndefined();
    }
  );

  apiTest(
    'rejects if owner no longer has adequate RBAC privileges',
    async ({ apiClient, esClient, config }) => {
      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: ownerCookie, profileUid: ownerProfileUid } = await loginAsObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const first = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(ownerCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const objectId1 = first.body.id;
      expect(first.body.accessControl.owner).toBe(ownerProfileUid);
      expect(first.body.accessControl.accessMode).toBe('write_restricted');

      const second = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(ownerCookie),
        body: { type: ACCESS_CONTROL_TYPE },
      });
      const objectId2 = second.body.id;
      expect(second.body.accessControl.owner).toBe(ownerProfileUid);
      expect(second.body.accessControl.accessMode).toBe('default');

      const objects = [
        { id: objectId1, type: first.body.type },
        { id: objectId2, type: second.body.type },
      ];

      // revoke privileges
      await createSimpleUser(esClient, ['viewer']);

      const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
      const get1 = await apiClient.get(`/access_control_objects/${objectId1}`, {
        headers: withXsrf(adminCookie),
      });
      expect(get1.body.accessControl.owner).toBe(ownerProfileUid);
      const get2 = await apiClient.get(`/access_control_objects/${objectId2}`, {
        headers: withXsrf(adminCookie),
      });
      expect(get2.body.accessControl.owner).toBe(ownerProfileUid);

      const { cookieHeader: revokedCookie, profileUid: revokedProfileUid } =
        await loginAsObjectOwner(apiClient, SIMPLE_USER_USERNAME, SIMPLE_USER_PASSWORD);
      expect(ownerProfileUid).toBe(revokedProfileUid);

      const res = await apiClient.post(BULK_UPDATE_PATH, {
        headers: withXsrf(revokedCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(403);
      expect(res.body.message).toContain(`Unable to bulk_update ${ACCESS_CONTROL_TYPE}`);
      expect(res.body.message).not.toContain(
        `, access control restrictions for ${ACCESS_CONTROL_TYPE}:`
      );
    }
  );
});
