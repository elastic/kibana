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
  BULK_DELETE_PATH,
  cleanupAccessControlObjects,
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

const DELETE_FORBIDDEN = accessControlForbiddenError('Deleting');

apiTest.describe('spaces access control - #bulk_delete', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ esClient, kbnClient }) => {
    await setupAccessControlUsers({ esClient, kbnClient });
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    await cleanupAccessControlObjects(kbnClient, log);
  });

  apiTest('allows owner to bulk delete objects in write-restricted mode', async ({ apiClient }) => {
    const { cookieHeader } = await loginAsObjectOwner(
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

    const res = await apiClient.post(BULK_DELETE_PATH, {
      headers: withXsrf(cookieHeader),
      body: { objects },
    });
    expect(res).toHaveStatusCode(200);
    expect(res.body.statuses).toHaveLength(2);
    for (const { id, success } of res.body.statuses) {
      expect(objects.find((obj) => obj.id === id)).toBeDefined();
      expect(success).toBe(true);
    }
  });

  apiTest(
    'allows non-owner to bulk delete objects in default mode',
    async ({ apiClient, esClient }) => {
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const first = await createOwnedObject(apiClient, ownerCookie, { type: ACCESS_CONTROL_TYPE });
      const second = await createOwnedObject(apiClient, ownerCookie, { type: ACCESS_CONTROL_TYPE });
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

      const res = await apiClient.post(BULK_DELETE_PATH, {
        headers: withXsrf(notOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);

      const get1 = await apiClient.get(objectPath(first.id), { headers: withXsrf(notOwnerCookie) });
      expect(get1).toHaveStatusCode(404);
      const get2 = await apiClient.get(objectPath(second.id), {
        headers: withXsrf(notOwnerCookie),
      });
      expect(get2).toHaveStatusCode(404);
    }
  );

  apiTest('allows admin to bulk delete objects they do not own', async ({ apiClient, config }) => {
    const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
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
    const res = await apiClient.post(BULK_DELETE_PATH, {
      headers: withXsrf(adminCookie),
      body: { objects },
    });
    expect(res).toHaveStatusCode(200);
    expect(res.body.statuses).toHaveLength(2);
    for (const { id, success } of res.body.statuses) {
      expect(objects.find((obj) => obj.id === id)).toBeDefined();
      expect(success).toBe(true);
    }
  });

  apiTest(
    'rejects if all objects are write-restricted and inaccessible',
    async ({ apiClient, esClient }) => {
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
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

      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const res = await apiClient.post(BULK_DELETE_PATH, {
        headers: withXsrf(notOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(403);
      expect(res.body.message).toContain(
        `Unable to bulk_delete ${ACCESS_CONTROL_TYPE}. Access control restrictions for objects:`
      );
      expect(res.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${first.id}`);
      expect(res.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${second.id}`);
      expect(res.body.message).toContain(
        `The "manage_access_control" privilege is required to affect write restricted objects owned by another user.`
      );
    }
  );

  apiTest(
    'returns status if all objects are write-restricted but some objects are owned by the current user',
    async ({ apiClient, esClient }) => {
      await activateSimpleUserProfile(esClient);
      const { cookieHeader: object1OwnerCookie, profileUid: obj1OwnerId } =
        await loginAsObjectOwner(apiClient, TEST_USER_USERNAME, TEST_USER_PASSWORD);
      const first = await createOwnedObject(apiClient, object1OwnerCookie, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: true,
      });
      expect(first.body.accessControl?.owner).toBe(obj1OwnerId);
      expect(first.body.accessControl?.accessMode).toBe('write_restricted');

      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: object2OwnerCookie, profileUid: obj2OwnerId } =
        await loginAsNotObjectOwner(apiClient, SIMPLE_USER_USERNAME, SIMPLE_USER_PASSWORD);
      const second = await createOwnedObject(apiClient, object2OwnerCookie, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: true,
      });
      expect(second.body.accessControl?.owner).toBe(obj2OwnerId);
      expect(second.body.accessControl?.accessMode).toBe('write_restricted');

      const objects = [
        { id: first.id, type: first.type },
        { id: second.id, type: second.type },
      ];
      const res = await apiClient.post(BULK_DELETE_PATH, {
        headers: withXsrf(object2OwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.statuses).toHaveLength(2);
      expect(res.body.statuses).toStrictEqual([
        {
          id: first.id,
          type: ACCESS_CONTROL_TYPE,
          success: false,
          error: DELETE_FORBIDDEN,
        },
        {
          id: second.id,
          type: ACCESS_CONTROL_TYPE,
          success: true,
        },
      ]);
    }
  );

  apiTest('returns status if some objects are in default mode', async ({ apiClient, esClient }) => {
    await activateSimpleUserProfile(esClient);
    const { cookieHeader: ownerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const first = await createOwnedObject(apiClient, ownerCookie, {
      type: ACCESS_CONTROL_TYPE,
      isWriteRestricted: true,
    });
    expect(first.body.accessControl?.owner).toBe(obj1OwnerId);
    expect(first.body.accessControl?.accessMode).toBe('write_restricted');

    const second = await createOwnedObject(apiClient, ownerCookie, {
      type: ACCESS_CONTROL_TYPE,
      isWriteRestricted: false,
    });
    expect(second.body.accessControl?.owner).toBe(obj1OwnerId);
    expect(second.body.accessControl?.accessMode).toBe('default');

    await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
    const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
      apiClient,
      SIMPLE_USER_USERNAME,
      SIMPLE_USER_PASSWORD
    );
    const objects = [
      { id: first.id, type: first.type },
      { id: second.id, type: second.type },
    ];
    const res = await apiClient.post(BULK_DELETE_PATH, {
      headers: withXsrf(notOwnerCookie),
      body: { objects },
    });
    expect(res).toHaveStatusCode(200);
    expect(res.body.statuses).toHaveLength(2);
    expect(res.body.statuses).toStrictEqual([
      {
        id: first.id,
        type: ACCESS_CONTROL_TYPE,
        success: false,
        error: DELETE_FORBIDDEN,
      },
      {
        id: second.id,
        type: ACCESS_CONTROL_TYPE,
        success: true,
      },
    ]);
  });

  apiTest(
    'returns status if some authorized types do not support access control',
    async ({ apiClient, esClient }) => {
      await activateSimpleUserProfile(esClient);
      const { cookieHeader: ownerCookie, profileUid: obj1OwnerId } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const first = await createOwnedObject(apiClient, ownerCookie, {
        type: ACCESS_CONTROL_TYPE,
        isWriteRestricted: true,
      });
      expect(first.body.accessControl?.owner).toBe(obj1OwnerId);
      expect(first.body.accessControl?.accessMode).toBe('write_restricted');

      const second = await createOwnedObject(apiClient, ownerCookie, {
        type: NON_ACCESS_CONTROL_TYPE,
      });
      expect(second.body.accessControl).toBeUndefined();

      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const objects = [
        { id: first.id, type: first.type },
        { id: second.id, type: second.type },
      ];
      const res = await apiClient.post(BULK_DELETE_PATH, {
        headers: withXsrf(notOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.statuses).toHaveLength(2);
      expect(res.body.statuses).toStrictEqual([
        {
          id: first.id,
          type: ACCESS_CONTROL_TYPE,
          success: false,
          error: DELETE_FORBIDDEN,
        },
        {
          id: second.id,
          type: NON_ACCESS_CONTROL_TYPE,
          success: true,
        },
      ]);
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

      // revoke privileges
      await createSimpleUser(esClient, ['viewer']);

      const { cookieHeader: adminCookie } = await loginAsKibanaAdmin(apiClient, config);
      const get1 = await apiClient.get(objectPath(first.id), { headers: withXsrf(adminCookie) });
      expect(get1.body.accessControl.owner).toBe(ownerProfileUid);
      const get2 = await apiClient.get(objectPath(second.id), { headers: withXsrf(adminCookie) });
      expect(get2.body.accessControl.owner).toBe(ownerProfileUid);

      const { cookieHeader: revokedCookie, profileUid: revokedProfileUid } =
        await loginAsObjectOwner(apiClient, SIMPLE_USER_USERNAME, SIMPLE_USER_PASSWORD);
      expect(ownerProfileUid).toBe(revokedProfileUid);

      const res = await apiClient.post(BULK_DELETE_PATH, {
        headers: withXsrf(revokedCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(403);
      expect(res.body.message).toContain(`Unable to bulk_delete ${ACCESS_CONTROL_TYPE}`);
      expect(res.body.message).not.toContain(`access control restrictions for`);
    }
  );

  // "force" bulk delete variants

  apiTest(
    'allow owner to force bulk delete objects marked as write-restricted',
    async ({ apiClient }) => {
      const { cookieHeader } = await loginAsObjectOwner(
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

      const res = await apiClient.post(BULK_DELETE_PATH, {
        headers: withXsrf(cookieHeader),
        body: { objects, force: true },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.statuses).toHaveLength(2);
      for (const { id, success } of res.body.statuses) {
        expect(objects.find((obj) => obj.id === id)).toBeDefined();
        expect(success).toBe(true);
      }
    }
  );

  apiTest(
    'allow admin to force bulk delete objects marked as write-restricted',
    async ({ apiClient, config }) => {
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
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
      const res = await apiClient.post(BULK_DELETE_PATH, {
        headers: withXsrf(adminCookie),
        body: { objects, force: true },
      });
      expect(res).toHaveStatusCode(200);
      expect(res.body.statuses).toHaveLength(2);
      for (const { id, success } of res.body.statuses) {
        expect(objects.find((obj) => obj.id === id)).toBeDefined();
        expect(success).toBe(true);
      }
    }
  );

  apiTest(
    'does not allow non-owner to force bulk delete objects marked as write-restricted',
    async ({ apiClient, esClient }) => {
      await activateSimpleUserProfile(esClient);
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
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

      // The non-owner runs with only the `viewer` role and still receives the
      // access-control 403 (not a generic RBAC denial).
      await createSimpleUser(esClient, ['viewer']);
      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const res = await apiClient.post(BULK_DELETE_PATH, {
        headers: withXsrf(notOwnerCookie),
        body: { objects, force: true },
      });
      expect(res).toHaveStatusCode(403);
      expect(res.body.message).toContain(
        `Unable to bulk_delete ${ACCESS_CONTROL_TYPE}. Access control restrictions for objects:`
      );
      expect(res.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${first.id}`);
      expect(res.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${second.id}`);
      expect(res.body.message).toContain(
        `The "manage_access_control" privilege is required to affect write restricted objects owned by another user.`
      );
    }
  );
});
