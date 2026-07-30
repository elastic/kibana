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
  accessControlForbiddenError,
  BULK_CREATE_PATH,
  cleanupAccessControlObjects,
  CREATE_PATH,
  createOwnedObject,
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

const OVERWRITE_FORBIDDEN = accessControlForbiddenError('Overwriting');

apiTest.describe('spaces access control - #bulk_create', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ esClient, kbnClient }) => {
    await setupAccessControlUsers({ esClient, kbnClient });
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    await cleanupAccessControlObjects(kbnClient, log);
  });

  apiTest('should create write-restricted objects', async ({ apiClient }) => {
    const { cookieHeader, profileUid } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const response = await apiClient.post(BULK_CREATE_PATH, {
      headers: withXsrf(cookieHeader),
      body: {
        objects: [
          { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
          { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
        ],
      },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.saved_objects).toHaveLength(2);
    for (const { accessControl } of response.body.saved_objects) {
      expect(accessControl.owner).toBe(profileUid);
      expect(accessControl.accessMode).toBe('write_restricted');
    }
  });

  apiTest('allows owner to overwrite objects they own', async ({ apiClient }) => {
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

    const res = await apiClient.post(`${BULK_CREATE_PATH}?overwrite=true`, {
      headers: withXsrf(cookieHeader),
      body: { objects },
    });
    expect(res).toHaveStatusCode(200);
    expect(res.body.saved_objects).toHaveLength(2);
    for (const { id, accessControl } of res.body.saved_objects) {
      expect(objects.find((obj) => obj.id === id)).toBeDefined();
      expect(accessControl.owner).toBe(profileUid);
      expect(accessControl.accessMode).toBe('write_restricted');
    }
  });

  apiTest(
    'allows non-owner to overwrite objects in default mode',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
        apiClient,
        config
      );
      const first = await createOwnedObject(apiClient, adminCookie, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: false,
      });
      const second = await createOwnedObject(apiClient, adminCookie, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: false,
      });
      const objects = [
        { id: first.id, type: first.type },
        { id: second.id, type: second.type },
      ];

      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        ACCESS_CONTROL_EDITOR_USERNAME,
        ACCESS_CONTROL_EDITOR_PASSWORD
      );
      const res = await apiClient.post(`${BULK_CREATE_PATH}?overwrite=true`, {
        headers: withXsrf(notOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.saved_objects).toHaveLength(2);
      expect(res.body.saved_objects[0].accessControl.owner).toBe(adminProfileUid);
      expect(res.body.saved_objects[0].accessControl.accessMode).toBe('default');
      expect(res.body.saved_objects[1].accessControl.owner).toBe(adminProfileUid);
      expect(res.body.saved_objects[1].accessControl.accessMode).toBe('default');
    }
  );

  apiTest('allows admin to overwrite objects they do not own', async ({ apiClient, config }) => {
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
    const res = await apiClient.post(`${BULK_CREATE_PATH}?overwrite=true`, {
      headers: withXsrf(adminCookie),
      body: { objects },
    });
    expect(res).toHaveStatusCode(200);
    expect(res.body.saved_objects).toHaveLength(2);
    for (const { id, accessControl } of res.body.saved_objects) {
      expect(objects.find((obj) => obj.id === id)).toBeDefined();
      expect(accessControl.owner).toBe(ownerProfileUid);
      expect(accessControl.accessMode).toBe('write_restricted');
    }
  });

  apiTest(
    'rejects when overwriting and all objects are write-restricted and inaccessible',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
        apiClient,
        config
      );
      const first = await createOwnedObject(apiClient, adminCookie, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: true,
      });
      const second = await createOwnedObject(apiClient, adminCookie, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: true,
      });
      const objectId1 = first.id;
      const objectId2 = second.id;
      const objects = [
        { id: objectId1, type: first.type },
        { id: objectId2, type: second.type },
      ];

      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        ACCESS_CONTROL_EDITOR_USERNAME,
        ACCESS_CONTROL_EDITOR_PASSWORD
      );
      const res = await apiClient.post(`${BULK_CREATE_PATH}?overwrite=true`, {
        headers: withXsrf(notOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toContain(
        `Unable to bulk_create ${ACCESS_CONTROL_TYPE}. Access control restrictions for objects:`
      );
      expect(res.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${objectId1}`);
      expect(res.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${objectId2}`);
      expect(res.body.message).toContain(
        `The "manage_access_control" privilege is required to affect write restricted objects owned by another user.`
      );

      const get1 = await apiClient.get(objectPath(objectId1), { headers: withXsrf(adminCookie) });
      expect(get1.body.accessControl.owner).toBe(adminProfileUid);
      expect(get1.body.accessControl.accessMode).toBe('write_restricted');
      const get2 = await apiClient.get(objectPath(objectId2), { headers: withXsrf(adminCookie) });
      expect(get2.body.accessControl.owner).toBe(adminProfileUid);
      expect(get2.body.accessControl.accessMode).toBe('write_restricted');
    }
  );

  apiTest(
    'returns status when overwriting and all objects are write-restricted but some are owned by current user',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
        apiClient,
        config
      );
      const first = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const objectId1 = first.body.id;
      expect(first.body.accessControl.owner).toBe(adminProfileUid);

      const { cookieHeader: notOwnerCookie, profileUid: nonAdminProfileUid } =
        await loginAsNotObjectOwner(
          apiClient,
          ACCESS_CONTROL_EDITOR_USERNAME,
          ACCESS_CONTROL_EDITOR_PASSWORD
        );
      const second = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(notOwnerCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const objectId2 = second.body.id;
      expect(second.body.accessControl.owner).toBe(nonAdminProfileUid);

      const objects = [
        { id: objectId1, type: first.body.type },
        { id: objectId2, type: second.body.type },
      ];

      const res = await apiClient.post(`${BULK_CREATE_PATH}?overwrite=true`, {
        headers: withXsrf(notOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.saved_objects).toHaveLength(2);
      expect(res.body.saved_objects[0]).toStrictEqual({
        id: objectId1,
        type: ACCESS_CONTROL_TYPE,
        error: OVERWRITE_FORBIDDEN,
      });
      expect(res.body.saved_objects[1].type).toBe(ACCESS_CONTROL_TYPE);
      expect(res.body.saved_objects[1].id).toBe(objectId2);
      expect(res.body.saved_objects[1].error).toBeUndefined();
    }
  );

  apiTest(
    'returns status when overwriting and some objects are in default mode',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
        apiClient,
        config
      );
      const first = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const objectId1 = first.body.id;
      expect(first.body.accessControl.owner).toBe(adminProfileUid);

      const second = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: false },
      });
      const objectId2 = second.body.id;
      expect(second.body.accessControl.owner).toBe(adminProfileUid);

      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        ACCESS_CONTROL_EDITOR_USERNAME,
        ACCESS_CONTROL_EDITOR_PASSWORD
      );
      const objects = [
        { id: objectId1, type: first.body.type },
        { id: objectId2, type: second.body.type },
      ];
      const res = await apiClient.post(`${BULK_CREATE_PATH}?overwrite=true`, {
        headers: withXsrf(notOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.saved_objects).toHaveLength(2);
      expect(res.body.saved_objects[0]).toStrictEqual({
        id: objectId1,
        type: ACCESS_CONTROL_TYPE,
        error: OVERWRITE_FORBIDDEN,
      });
      expect(res.body.saved_objects[1].type).toBe(ACCESS_CONTROL_TYPE);
      expect(res.body.saved_objects[1].id).toBe(objectId2);
      expect(res.body.saved_objects[1].error).toBeUndefined();
    }
  );

  apiTest(
    'returns status when overwriting and some authorized types do not support access control',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileUid } = await loginAsKibanaAdmin(
        apiClient,
        config
      );
      const first = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const objectId1 = first.body.id;
      expect(first.body.accessControl.owner).toBe(adminProfileUid);

      const second = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: NON_ACCESS_CONTROL_TYPE },
      });
      const objectId2 = second.body.id;
      expect(second.body.accessControl).toBeUndefined();

      const objects = [
        { id: objectId1, type: first.body.type },
        { id: objectId2, type: second.body.type },
      ];

      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        ACCESS_CONTROL_EDITOR_USERNAME,
        ACCESS_CONTROL_EDITOR_PASSWORD
      );
      const res = await apiClient.post(`${BULK_CREATE_PATH}?overwrite=true`, {
        headers: withXsrf(notOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.saved_objects).toHaveLength(2);
      expect(res.body.saved_objects[0]).toStrictEqual({
        id: objectId1,
        type: ACCESS_CONTROL_TYPE,
        error: OVERWRITE_FORBIDDEN,
      });
      expect(res.body.saved_objects[1].type).toBe(NON_ACCESS_CONTROL_TYPE);
      expect(res.body.saved_objects[1].id).toBe(objectId2);
      expect(res.body.saved_objects[1].error).toBeUndefined();
    }
  );

  apiTest(
    'rejects when overwriting by owner if RBAC privileges are revoked',
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

      const second = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(ownerCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      const objectId2 = second.body.id;
      expect(second.body.accessControl.owner).toBe(ownerProfileUid);

      const objects = [
        { id: objectId1, type: first.body.type },
        { id: objectId2, type: second.body.type },
      ];

      // revoke privileges
      await createSimpleUser(esClient, ['viewer']);

      const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
      const get1 = await apiClient.get(objectPath(objectId1), { headers: withXsrf(adminCookie) });
      expect(get1.body.accessControl.owner).toBe(ownerProfileUid);
      const get2 = await apiClient.get(objectPath(objectId2), { headers: withXsrf(adminCookie) });
      expect(get2.body.accessControl.owner).toBe(ownerProfileUid);

      const { cookieHeader: revokedCookie, profileUid: revokedProfileUid } =
        await loginAsObjectOwner(apiClient, SIMPLE_USER_USERNAME, SIMPLE_USER_PASSWORD);
      expect(ownerProfileUid).toBe(revokedProfileUid);

      const res = await apiClient.post(`${BULK_CREATE_PATH}?overwrite=true`, {
        headers: withXsrf(revokedCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toBe(`Unable to bulk_create ${ACCESS_CONTROL_TYPE}`);
    }
  );
});
