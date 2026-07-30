/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

// Shared access-control auth/user helpers live in the sibling (feature-enabled) suite.
import {
  ACCESS_CONTROL_TYPE,
  adminBasicAuthHeader,
  BULK_CREATE_PATH,
  BULK_DELETE_PATH,
  BULK_UPDATE_PATH,
  CHANGE_MODE_PATH,
  CHANGE_OWNER_PATH,
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
  UPDATE_PATH,
  withXsrf,
} from '../../../scout_spaces_access_control/api/common/access_control';

const NOT_SUPPORTED_MESSAGE = `Cannot create a saved object of type ${ACCESS_CONTROL_TYPE} with an access mode because the type does not support access control: Bad Request`;

const createObject = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  body: Record<string, unknown>
) => apiClient.post(CREATE_PATH, { headers: withXsrf(headers), body });

const getObject = (apiClient: ApiClientFixture, headers: Record<string, string>, id: string) =>
  apiClient.get(objectPath(id), { headers: withXsrf(headers) });

// The access_control_test_plugin still registers `access_control_type` as `supportsAccessControl: true`,
// but `savedObjects.enableAccessControl=false` means the feature is inert: the type must behave like any
// other saved object that does not support access control.
apiTest.describe('spaces access control - feature disabled', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ esClient, kbnClient }) => {
    await setupAccessControlUsers({ esClient, kbnClient });
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    await cleanupAccessControlObjects(kbnClient, log);
  });

  // #create

  apiTest('rejects creating a write-restricted object', async ({ apiClient, config }) => {
    const { cookieHeader } = await loginAsKibanaAdmin(apiClient, config);
    const response = await createObject(apiClient, cookieHeader, {
      type: ACCESS_CONTROL_TYPE,
      isWriteRestricted: true,
    });
    expect(response).toHaveStatusCode(400);
    expect(response.body.error).toBe('Bad Request');
    expect(response.body.message).toContain(NOT_SUPPORTED_MESSAGE);
  });

  apiTest(
    'allows creating an object without access control metadata',
    async ({ apiClient, config }) => {
      const { cookieHeader } = await loginAsKibanaAdmin(apiClient, config);
      const response = await createObject(apiClient, cookieHeader, { type: ACCESS_CONTROL_TYPE });
      expect(response).toHaveStatusCode(200);
      expect(response.body.accessControl).toBeUndefined();
      expect(response.body.type).toBe(ACCESS_CONTROL_TYPE);
    }
  );

  apiTest(
    'allows creating an object when there is no active user profile',
    async ({ apiClient, config }) => {
      const response = await createObject(apiClient, adminBasicAuthHeader(config), {
        type: ACCESS_CONTROL_TYPE,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.accessControl).toBeUndefined();
      expect(response.body.type).toBe(ACCESS_CONTROL_TYPE);
    }
  );

  apiTest('allows overwriting an object by the creating user', async ({ apiClient }) => {
    const { cookieHeader } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const createResponse = await createObject(apiClient, cookieHeader, {
      type: ACCESS_CONTROL_TYPE,
      description: 'this will change',
    });
    expect(createResponse).toHaveStatusCode(200);
    const objectId = createResponse.body.id;
    expect(createResponse.body.accessControl).toBeUndefined();

    const getBefore = await getObject(apiClient, cookieHeader, objectId);
    expect(getBefore).toHaveStatusCode(200);
    expect(getBefore.body.accessControl).toBeUndefined();
    expect(getBefore.body.attributes.description).toBe('this will change');

    const overwriteResponse = await apiClient.post(`${CREATE_PATH}?overwrite=true`, {
      headers: withXsrf(cookieHeader),
      body: { id: objectId, type: ACCESS_CONTROL_TYPE, description: 'overwritten!' },
    });
    expect(overwriteResponse).toHaveStatusCode(200);
    expect(overwriteResponse.body.id).toBe(objectId);
    expect(overwriteResponse.body.accessControl).toBeUndefined();

    const getAfter = await getObject(apiClient, cookieHeader, objectId);
    expect(getAfter).toHaveStatusCode(200);
    expect(getAfter.body.accessControl).toBeUndefined();
    expect(getAfter.body.attributes.description).toBe('overwritten!');
  });

  apiTest('allows overwriting an object by a different user', async ({ apiClient, esClient }) => {
    const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const createResponse = await createObject(apiClient, ownerCookie, {
      type: ACCESS_CONTROL_TYPE,
      description: 'this will change',
    });
    expect(createResponse).toHaveStatusCode(200);
    const objectId = createResponse.body.id;
    expect(createResponse.body.accessControl).toBeUndefined();

    const getBefore = await getObject(apiClient, ownerCookie, objectId);
    expect(getBefore).toHaveStatusCode(200);
    expect(getBefore.body.accessControl).toBeUndefined();
    expect(getBefore.body.attributes.description).toBe('this will change');

    await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
    const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
      apiClient,
      SIMPLE_USER_USERNAME,
      SIMPLE_USER_PASSWORD
    );
    const overwriteResponse = await apiClient.post(`${CREATE_PATH}?overwrite=true`, {
      headers: withXsrf(notOwnerCookie),
      body: { id: objectId, type: ACCESS_CONTROL_TYPE, description: 'overwritten!' },
    });
    expect(overwriteResponse).toHaveStatusCode(200);
    expect(overwriteResponse.body.id).toBe(objectId);
    expect(overwriteResponse.body.accessControl).toBeUndefined();

    const getAfter = await getObject(apiClient, notOwnerCookie, objectId);
    expect(getAfter).toHaveStatusCode(200);
    expect(getAfter.body.accessControl).toBeUndefined();
    expect(getAfter.body.attributes.description).toBe('overwritten!');
  });

  // #bulk_create

  apiTest(
    'returns error status when attempting to create write-restricted objects',
    async ({ apiClient, config }) => {
      const { cookieHeader } = await loginAsKibanaAdmin(apiClient, config);
      const response = await apiClient.post(BULK_CREATE_PATH, {
        headers: withXsrf(cookieHeader),
        body: {
          objects: [
            { type: ACCESS_CONTROL_TYPE, description: 'valid object' },
            { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true, description: 'invalid object' },
          ],
        },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.saved_objects).toHaveLength(2);
      expect(response.body.saved_objects[0].attributes.description).toBe('valid object');
      expect(response.body.saved_objects[1].error.message).toBe(NOT_SUPPORTED_MESSAGE);
      expect(response.body.saved_objects[1].error.statusCode).toBe(400);
      expect(response.body.saved_objects[1].error.error).toBe('Bad Request');
    }
  );

  apiTest('allows creating objects without access control metadata', async ({ apiClient }) => {
    const { cookieHeader } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const response = await apiClient.post(BULK_CREATE_PATH, {
      headers: withXsrf(cookieHeader),
      body: { objects: [{ type: ACCESS_CONTROL_TYPE }, { type: ACCESS_CONTROL_TYPE }] },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.saved_objects).toHaveLength(2);
    for (const obj of response.body.saved_objects) {
      expect(obj.accessControl).toBeUndefined();
      const getResponse = await getObject(apiClient, cookieHeader, obj.id);
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.accessControl).toBeUndefined();
    }
  });

  apiTest(
    'allows creating objects when there is no active user profile',
    async ({ apiClient, config }) => {
      const response = await apiClient.post(BULK_CREATE_PATH, {
        headers: withXsrf(adminBasicAuthHeader(config)),
        body: { objects: [{ type: ACCESS_CONTROL_TYPE }, { type: ACCESS_CONTROL_TYPE }] },
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.saved_objects).toHaveLength(2);
      for (const obj of response.body.saved_objects) {
        expect(obj.accessControl).toBeUndefined();
        const getResponse = await getObject(apiClient, adminBasicAuthHeader(config), obj.id);
        expect(getResponse).toHaveStatusCode(200);
        expect(getResponse.body.accessControl).toBeUndefined();
        expect(getResponse.body.createdBy).toBeUndefined();
      }
    }
  );

  apiTest('allows overwriting objects by the creating user', async ({ apiClient }) => {
    const { cookieHeader } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const first = await createObject(apiClient, cookieHeader, {
      type: ACCESS_CONTROL_TYPE,
      description: 'this will change',
    });
    const second = await createObject(apiClient, cookieHeader, {
      type: ACCESS_CONTROL_TYPE,
      description: 'this will also change',
    });
    const objects = [
      { id: first.body.id, type: first.body.type, description: 'overwritten!' },
      { id: second.body.id, type: second.body.type, description: 'overwritten!' },
    ];

    const res = await apiClient.post(`${BULK_CREATE_PATH}?overwrite=true`, {
      headers: withXsrf(cookieHeader),
      body: { objects },
    });
    expect(res).toHaveStatusCode(200);
    expect(res.body.saved_objects).toHaveLength(2);
    for (const { id } of res.body.saved_objects) {
      expect(objects.find((obj) => obj.id === id)).toBeDefined();
      const getResponse = await getObject(apiClient, cookieHeader, id);
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.accessControl).toBeUndefined();
      expect(getResponse.body.attributes.description).toBe('overwritten!');
    }
  });

  apiTest('allows overwriting objects by a different user', async ({ apiClient, esClient }) => {
    const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const first = await createObject(apiClient, ownerCookie, {
      type: ACCESS_CONTROL_TYPE,
      description: 'this will change',
    });
    const second = await createObject(apiClient, ownerCookie, {
      type: ACCESS_CONTROL_TYPE,
      description: 'this will also change',
    });
    const objects = [
      { id: first.body.id, type: first.body.type, description: 'overwritten!' },
      { id: second.body.id, type: second.body.type, description: 'overwritten!' },
    ];

    await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
    const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
      apiClient,
      SIMPLE_USER_USERNAME,
      SIMPLE_USER_PASSWORD
    );
    const res = await apiClient.post(`${BULK_CREATE_PATH}?overwrite=true`, {
      headers: withXsrf(notOwnerCookie),
      body: { objects },
    });
    expect(res).toHaveStatusCode(200);
    expect(res.body.saved_objects).toHaveLength(2);
    for (const { id } of res.body.saved_objects) {
      expect(objects.find((obj) => obj.id === id)).toBeDefined();
      const getResponse = await getObject(apiClient, notOwnerCookie, id);
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.accessControl).toBeUndefined();
      expect(getResponse.body.attributes.description).toBe('overwritten!');
    }
  });

  // #update

  apiTest('allows update of an object by the creating user', async ({ apiClient }) => {
    const { cookieHeader } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const createResponse = await createObject(apiClient, cookieHeader, {
      type: ACCESS_CONTROL_TYPE,
    });
    expect(createResponse).toHaveStatusCode(200);
    const objectId = createResponse.body.id;
    expect(createResponse.body.attributes.description).toBe('test');
    expect(createResponse.body.accessControl).toBeUndefined();

    const updateResponse = await apiClient.put(UPDATE_PATH, {
      headers: withXsrf(cookieHeader),
      body: { objectId, type: ACCESS_CONTROL_TYPE },
    });
    expect(updateResponse).toHaveStatusCode(200);
    expect(updateResponse.body.id).toBe(objectId);
    expect(updateResponse.body.attributes.description).toBe('updated description');

    const getResponse = await getObject(apiClient, cookieHeader, objectId);
    expect(getResponse.body.accessControl).toBeUndefined();
    expect(getResponse.body.attributes.description).toBe('updated description');
  });

  apiTest('allows update of an object by a different user', async ({ apiClient, esClient }) => {
    const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const createResponse = await createObject(apiClient, ownerCookie, {
      type: ACCESS_CONTROL_TYPE,
    });
    expect(createResponse).toHaveStatusCode(200);
    const objectId = createResponse.body.id;
    expect(createResponse.body.attributes.description).toBe('test');
    expect(createResponse.body.accessControl).toBeUndefined();

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
  });

  apiTest(
    'rejects update of an object by a user without RBAC permissions',
    async ({ apiClient, esClient }) => {
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const createResponse = await createObject(apiClient, ownerCookie, {
        type: ACCESS_CONTROL_TYPE,
      });
      expect(createResponse).toHaveStatusCode(200);
      const objectId = createResponse.body.id;
      expect(createResponse.body.attributes.description).toBe('test');
      expect(createResponse.body.accessControl).toBeUndefined();

      await createSimpleUser(esClient, ['viewer']);
      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const updateResponse = await apiClient.put(UPDATE_PATH, {
        headers: withXsrf(notOwnerCookie),
        body: { objectId, type: ACCESS_CONTROL_TYPE },
      });
      expect(updateResponse).toHaveStatusCode(403);
    }
  );

  // #bulk_update

  apiTest('allows bulk update of objects by the creating user', async ({ apiClient }) => {
    const { cookieHeader } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const first = await createObject(apiClient, cookieHeader, { type: ACCESS_CONTROL_TYPE });
    const second = await createObject(apiClient, cookieHeader, { type: ACCESS_CONTROL_TYPE });
    const objects = [
      { id: first.body.id, type: first.body.type },
      { id: second.body.id, type: second.body.type },
    ];

    const res = await apiClient.post(BULK_UPDATE_PATH, {
      headers: withXsrf(cookieHeader),
      body: { objects },
    });
    expect(res).toHaveStatusCode(200);
    expect(res.body.saved_objects).toHaveLength(2);
    for (const { id, attributes } of res.body.saved_objects) {
      expect(objects.find((obj) => obj.id === id)).toBeDefined();
      expect(attributes.description).toBe('updated description');
    }
  });

  apiTest('allows bulk update of objects by a different user', async ({ apiClient, esClient }) => {
    const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const first = await createObject(apiClient, ownerCookie, { type: ACCESS_CONTROL_TYPE });
    const second = await createObject(apiClient, ownerCookie, { type: ACCESS_CONTROL_TYPE });
    const objects = [
      { id: first.body.id, type: first.body.type },
      { id: second.body.id, type: second.body.type },
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
    for (const { id, attributes } of res.body.saved_objects) {
      expect(objects.find((obj) => obj.id === id)).toBeDefined();
      expect(attributes.description).toBe('updated description');
    }
  });

  apiTest(
    'rejects bulk update of objects by a user without RBAC permissions',
    async ({ apiClient, esClient }) => {
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const first = await createObject(apiClient, ownerCookie, { type: ACCESS_CONTROL_TYPE });
      const second = await createObject(apiClient, ownerCookie, { type: ACCESS_CONTROL_TYPE });
      const objects = [
        { id: first.body.id, type: first.body.type },
        { id: second.body.id, type: second.body.type },
      ];

      await createSimpleUser(esClient, ['viewer']);
      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const res = await apiClient.post(BULK_UPDATE_PATH, {
        headers: withXsrf(notOwnerCookie),
        body: { objects },
      });
      expect(res).toHaveStatusCode(403);
      expect(res.body.message).toContain(`Unable to bulk_update ${ACCESS_CONTROL_TYPE}`);
    }
  );

  // #delete

  apiTest('allows the creating user to delete an object', async ({ apiClient }) => {
    const { cookieHeader } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const createResponse = await createObject(apiClient, cookieHeader, {
      type: ACCESS_CONTROL_TYPE,
    });
    expect(createResponse).toHaveStatusCode(200);
    const objectId = createResponse.body.id;

    const deleteResponse = await apiClient.delete(objectPath(objectId), {
      headers: withXsrf(cookieHeader),
    });
    expect(deleteResponse).toHaveStatusCode(200);

    const getResponse = await getObject(apiClient, cookieHeader, objectId);
    expect(getResponse).toHaveStatusCode(404);
    expect(getResponse.body.message).toContain(
      `Saved object [${ACCESS_CONTROL_TYPE}/${objectId}] not found`
    );
  });

  apiTest(
    'allows a non-creating user with permissions to delete an object',
    async ({ apiClient, esClient }) => {
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const createResponse = await createObject(apiClient, ownerCookie, {
        type: ACCESS_CONTROL_TYPE,
      });
      expect(createResponse).toHaveStatusCode(200);
      const objectId = createResponse.body.id;

      await createSimpleUser(esClient, ['kibana_savedobjects_editor']);
      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const deleteResponse = await apiClient.delete(objectPath(objectId), {
        headers: withXsrf(notOwnerCookie),
      });
      expect(deleteResponse).toHaveStatusCode(200);

      const getResponse = await getObject(apiClient, ownerCookie, objectId);
      expect(getResponse).toHaveStatusCode(404);
      expect(getResponse.body.message).toContain(
        `Saved object [${ACCESS_CONTROL_TYPE}/${objectId}] not found`
      );
    }
  );

  apiTest(
    'rejects deletion of an object by a user without RBAC permissions',
    async ({ apiClient, esClient }) => {
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const createResponse = await createObject(apiClient, ownerCookie, {
        type: ACCESS_CONTROL_TYPE,
      });
      expect(createResponse).toHaveStatusCode(200);
      const objectId = createResponse.body.id;

      await createSimpleUser(esClient, ['viewer']);
      const { cookieHeader: notOwnerCookie } = await loginAsNotObjectOwner(
        apiClient,
        SIMPLE_USER_USERNAME,
        SIMPLE_USER_PASSWORD
      );
      const deleteResponse = await apiClient.delete(objectPath(objectId), {
        headers: withXsrf(notOwnerCookie),
      });
      expect(deleteResponse).toHaveStatusCode(403);
      expect(deleteResponse.body.message).toContain(`Unable to delete ${ACCESS_CONTROL_TYPE}`);
    }
  );

  // #bulk_delete

  apiTest('allows bulk delete of objects by the creating user', async ({ apiClient }) => {
    const { cookieHeader } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const first = await createObject(apiClient, cookieHeader, { type: ACCESS_CONTROL_TYPE });
    const second = await createObject(apiClient, cookieHeader, { type: ACCESS_CONTROL_TYPE });
    const objects = [
      { id: first.body.id, type: first.body.type },
      { id: second.body.id, type: second.body.type },
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

  apiTest('allows bulk delete of objects by a different user', async ({ apiClient, esClient }) => {
    const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const first = await createObject(apiClient, ownerCookie, { type: ACCESS_CONTROL_TYPE });
    const second = await createObject(apiClient, ownerCookie, { type: ACCESS_CONTROL_TYPE });
    const objects = [
      { id: first.body.id, type: first.body.type },
      { id: second.body.id, type: second.body.type },
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
    expect(res.body.statuses).toHaveLength(2);
    for (const { id, success } of res.body.statuses) {
      expect(objects.find((obj) => obj.id === id)).toBeDefined();
      expect(success).toBe(true);
    }
  });

  apiTest(
    'rejects bulk delete of objects by a user without RBAC permissions',
    async ({ apiClient, esClient }) => {
      const { cookieHeader: ownerCookie } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );
      const first = await createObject(apiClient, ownerCookie, { type: ACCESS_CONTROL_TYPE });
      const second = await createObject(apiClient, ownerCookie, { type: ACCESS_CONTROL_TYPE });
      const objects = [
        { id: first.body.id, type: first.body.type },
        { id: second.body.id, type: second.body.type },
      ];

      await createSimpleUser(esClient, ['viewer']);
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
      expect(res.body.message).toContain(`Unable to bulk_delete ${ACCESS_CONTROL_TYPE}`);
    }
  );

  // #change_owner

  apiTest('throws when trying to update ownership of an ownable type', async ({ apiClient }) => {
    const { cookieHeader } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const createResponse = await createObject(apiClient, cookieHeader, {
      type: ACCESS_CONTROL_TYPE,
    });
    expect(createResponse).toHaveStatusCode(200);
    const objectId = createResponse.body.id;

    const response = await apiClient.put(CHANGE_OWNER_PATH, {
      headers: withXsrf(cookieHeader),
      body: {
        objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
        newOwnerProfileUid: 'u_nonexistinguser_ver',
      },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.objects).toHaveLength(1);
    const objectToAssert = response.body.objects[0];
    expect(objectToAssert.id).toBe(objectId);
    expect(objectToAssert.type).toBe(ACCESS_CONTROL_TYPE);
    expect(objectToAssert.error.output.payload.message).toContain(
      `The type ${ACCESS_CONTROL_TYPE} does not support access control: Bad Request`
    );
  });

  // #change_access_mode

  apiTest('throws when trying to update access mode of an ownable type', async ({ apiClient }) => {
    const { cookieHeader } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );
    const createResponse = await createObject(apiClient, cookieHeader, {
      type: ACCESS_CONTROL_TYPE,
    });
    expect(createResponse).toHaveStatusCode(200);
    const objectId = createResponse.body.id;

    const response = await apiClient.put(CHANGE_MODE_PATH, {
      headers: withXsrf(cookieHeader),
      body: {
        objects: [{ id: objectId, type: ACCESS_CONTROL_TYPE }],
        newAccessMode: 'write_restricted',
      },
    });
    expect(response).toHaveStatusCode(200);
    expect(response.body.objects).toHaveLength(1);
    const objectToAssert = response.body.objects[0];
    expect(objectToAssert.id).toBe(objectId);
    expect(objectToAssert.type).toBe(ACCESS_CONTROL_TYPE);
    expect(objectToAssert.error.output.payload.message).toContain(
      `The type ${ACCESS_CONTROL_TYPE} does not support access control: Bad Request`
    );
  });
});
