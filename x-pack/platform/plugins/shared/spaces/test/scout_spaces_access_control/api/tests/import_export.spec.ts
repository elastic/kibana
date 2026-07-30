/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import FormData from 'form-data';

import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  ACCESS_CONTROL_EDITOR_PASSWORD,
  ACCESS_CONTROL_EDITOR_USERNAME,
  ACCESS_CONTROL_TYPE,
  accessControlForbiddenError,
  objectPath as accessControlObjectPath,
  adminBasicAuthHeader,
  cleanupAccessControlObjects,
  CREATE_PATH,
  loginAsKibanaAdmin,
  loginAsNotObjectOwner,
  loginAsObjectOwner,
  NON_ACCESS_CONTROL_TYPE,
  nonAccessControlObjectPath,
  setupAccessControlUsers,
  TEST_USER_PASSWORD,
  TEST_USER_USERNAME,
  withXsrf,
} from '../common/access_control';

const OVERWRITE_FORBIDDEN_ERROR = {
  ...accessControlForbiddenError('Overwriting'),
  type: 'unknown',
};

/** Builds the multipart body (NDJSON `file` plus optional extra fields) for the import routes. */
const buildImportFormData = (
  toImport: object[],
  extraFields: Record<string, string> = {}
): { buffer: Buffer; headers: Record<string, string> } => {
  const requestBody = toImport.map((obj) => JSON.stringify(obj)).join('\n');
  const formData = new FormData();
  for (const [key, value] of Object.entries(extraFields)) {
    formData.append(key, value);
  }
  formData.append('file', Buffer.from(requestBody, 'utf8'), 'export.ndjson');
  return { buffer: formData.getBuffer(), headers: formData.getHeaders() };
};

const importObjects = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  toImport: object[],
  {
    overwrite = false,
    createNewCopies = true,
  }: { overwrite?: boolean; createNewCopies?: boolean } = {}
): Promise<ApiClientResponse> => {
  const query = overwrite ? '?overwrite=true' : createNewCopies ? '?createNewCopies=true' : '';
  const formData = buildImportFormData(toImport);
  return apiClient.post(`/api/saved_objects/_import${query}`, {
    headers: { ...withXsrf(headers), ...formData.headers },
    body: formData.buffer,
  });
};

const resolveImportErrors = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  toImport: object[],
  retries: object[],
  { createNewCopies = true }: { createNewCopies?: boolean } = {}
): Promise<ApiClientResponse> => {
  const query = createNewCopies ? '?createNewCopies=true' : '';
  const formData = buildImportFormData(toImport, { retries: JSON.stringify(retries) });
  return apiClient.post(`/api/saved_objects/_resolve_import_errors${query}`, {
    headers: { ...withXsrf(headers), ...formData.headers },
    body: formData.buffer,
  });
};

const EXCLUDED_META = {
  excludedObjects: [],
  excludedObjectsCount: 0,
  exportedCount: 1,
  missingRefCount: 0,
  missingReferences: [],
};

/** Placeholder profile uid used when the creating/updating user is irrelevant to the test. */
const UNRELATED_PROFILE_UID = 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0';

interface ImportObjectParams {
  id: string;
  type?: string;
  accessControl?: { accessMode: 'default' | 'write_restricted'; owner: string };
  description?: string;
  /** Applied to both `created_by` and `updated_by` (always identical in these fixtures). */
  profileUid?: string;
}

/** Builds one NDJSON saved-object line for the import/resolve-import-errors payloads. */
const buildImportObject = ({
  id,
  type = ACCESS_CONTROL_TYPE,
  accessControl,
  description = 'test',
  profileUid = UNRELATED_PROFILE_UID,
}: ImportObjectParams) => ({
  ...(accessControl ? { accessControl } : {}),
  attributes: { description },
  coreMigrationVersion: '8.8.0',
  created_at: '2025-07-16T10:03:03.253Z',
  created_by: profileUid,
  id,
  managed: false,
  references: [],
  type,
  updated_at: '2025-07-16T10:03:03.253Z',
  updated_by: profileUid,
  version: 'WzY5LDFd',
});

apiTest.describe('spaces access control - import/export', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ esClient, kbnClient }) => {
    await setupAccessControlUsers({ esClient, kbnClient });
  });

  apiTest.afterAll(async ({ kbnClient, log }) => {
    await cleanupAccessControlObjects(kbnClient, log);
  });

  apiTest(
    'should reject import of objects with unexpected access control metadata (unsupported types)',
    async ({ apiClient }) => {
      const { cookieHeader } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );

      const toImport = [
        buildImportObject({
          id: '11111111111111111111111111111111',
          type: NON_ACCESS_CONTROL_TYPE,
          accessControl: { accessMode: 'default', owner: 'just_some_dude' },
        }),
        EXCLUDED_META,
      ];

      const response = await importObjects(apiClient, cookieHeader, toImport);
      expect(response).toHaveStatusCode(200);
      expect(response.body.successResults).toBeUndefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0].error.type).toBe('unexpected_access_control_metadata');
    }
  );

  apiTest(
    `should apply the current user as owner, and 'default' access mode, only to supported object types`,
    async ({ apiClient }) => {
      const { cookieHeader, profileUid: testProfileId } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );

      const toImport = [
        buildImportObject({
          id: '11111111111111111111111111111111',
          accessControl: { accessMode: 'write_restricted', owner: 'some_user' },
        }),
        buildImportObject({
          id: '22222222222222222222222222222222',
          type: NON_ACCESS_CONTROL_TYPE,
        }),
        EXCLUDED_META,
      ];

      const response = await importObjects(apiClient, cookieHeader, toImport);
      expect(response).toHaveStatusCode(200);
      const results = response.body.successResults;
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      expect(results[0].type).toBe(ACCESS_CONTROL_TYPE);
      expect(results[1].type).toBe(NON_ACCESS_CONTROL_TYPE);

      const acGet = await apiClient.get(accessControlObjectPath(results[0].destinationId), {
        headers: withXsrf(cookieHeader),
      });
      expect(acGet).toHaveStatusCode(200);
      expect(acGet.body.accessControl.accessMode).toBe('default');
      expect(acGet.body.accessControl.owner).toBe(testProfileId);

      const nonAcGet = await apiClient.get(nonAccessControlObjectPath(results[1].destinationId), {
        headers: withXsrf(cookieHeader),
      });
      expect(nonAcGet).toHaveStatusCode(200);
      expect(nonAcGet.body.accessControl).toBeUndefined();
    }
  );

  apiTest(
    'should create objects supporting access control without access control metadata if there is no profile ID',
    async ({ apiClient, config }) => {
      const toImport = [
        buildImportObject({
          id: '11111111111111111111111111111111',
          accessControl: { accessMode: 'write_restricted', owner: 'some_user' },
        }),
        buildImportObject({
          id: '22222222222222222222222222222222',
          type: NON_ACCESS_CONTROL_TYPE,
        }),
        EXCLUDED_META,
      ];

      const response = await importObjects(apiClient, adminBasicAuthHeader(config), toImport, {
        createNewCopies: true,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.success).toBe(true);
      expect(response.body.successCount).toBe(2);
      const results = response.body.successResults;
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      expect(results[0].type).toBe(ACCESS_CONTROL_TYPE);
      expect(results[0].destinationId).toBeDefined();
      expect(results[1].type).toBe(NON_ACCESS_CONTROL_TYPE);
      expect(results[1].destinationId).toBeDefined();

      const acGet = await apiClient.get(accessControlObjectPath(results[0].destinationId), {
        headers: withXsrf(adminBasicAuthHeader(config)),
      });
      expect(acGet).toHaveStatusCode(200);
      expect(acGet.body.accessControl).toBeUndefined();

      const nonAcGet = await apiClient.get(nonAccessControlObjectPath(results[1].destinationId), {
        headers: withXsrf(adminBasicAuthHeader(config)),
      });
      expect(nonAcGet).toHaveStatusCode(200);
      expect(nonAcGet.body.accessControl).toBeUndefined();
    }
  );

  apiTest(
    'should apply defaults to objects with no access control metadata',
    async ({ apiClient }) => {
      const { cookieHeader, profileUid: testProfileId } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );

      const toImport = [
        buildImportObject({ id: '11111111111111111111111111111111' }),
        buildImportObject({
          id: '22222222222222222222222222222222',
          type: NON_ACCESS_CONTROL_TYPE,
        }),
        { ...EXCLUDED_META, exportedCount: 2 },
      ];

      const response = await importObjects(apiClient, cookieHeader, toImport);
      expect(response).toHaveStatusCode(200);
      const results = response.body.successResults;
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      expect(results[0].type).toBe(ACCESS_CONTROL_TYPE);
      expect(results[1].type).toBe(NON_ACCESS_CONTROL_TYPE);

      const acGet = await apiClient.get(accessControlObjectPath(results[0].destinationId), {
        headers: withXsrf(cookieHeader),
      });
      expect(acGet).toHaveStatusCode(200);
      expect(acGet.body.accessControl.accessMode).toBe('default');
      expect(acGet.body.accessControl.owner).toBe(testProfileId);

      const nonAcGet = await apiClient.get(nonAccessControlObjectPath(results[1].destinationId), {
        headers: withXsrf(cookieHeader),
      });
      expect(nonAcGet).toHaveStatusCode(200);
      expect(nonAcGet.body.accessControl).toBeUndefined();
    }
  );

  apiTest(
    'should disallow overwrite of owned objects if not owned by the current user',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin(
        apiClient,
        config
      );
      const adminCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(adminCreate).toHaveStatusCode(200);
      expect(adminCreate.body.accessControl.owner).toBe(adminProfileId);
      const adminObjId = adminCreate.body.id;

      const { cookieHeader: testUserCookie, profileUid: testProfileId } =
        await loginAsNotObjectOwner(
          apiClient,
          ACCESS_CONTROL_EDITOR_USERNAME,
          ACCESS_CONTROL_EDITOR_PASSWORD
        );
      const testUserCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(testUserCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(testUserCreate).toHaveStatusCode(200);
      expect(testUserCreate.body.accessControl.owner).toBe(testProfileId);
      const testUserObjId = testUserCreate.body.id;

      const toImport = [
        buildImportObject({
          id: testUserObjId,
          accessControl: { accessMode: 'write_restricted', owner: testProfileId },
          profileUid: testProfileId,
        }),
        buildImportObject({
          id: adminObjId,
          accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
          profileUid: adminProfileId,
        }),
        { ...EXCLUDED_META, exportedCount: 2 },
      ];

      const response = await importObjects(apiClient, testUserCookie, toImport, {
        overwrite: true,
        createNewCopies: false,
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.successCount).toBe(1);
      expect(response.body.success).toBe(false);
      expect(response.body.successResults).toStrictEqual([
        {
          type: ACCESS_CONTROL_TYPE,
          id: testUserObjId,
          meta: {},
          managed: false,
          overwrite: true,
        },
      ]);
      expect(response.body.errors).toStrictEqual([
        {
          id: adminObjId,
          type: ACCESS_CONTROL_TYPE,
          meta: {},
          error: OVERWRITE_FORBIDDEN_ERROR,
          overwrite: true,
        },
      ]);
    }
  );

  apiTest(
    'should throw if the import only contains objects that are not overwritable by the current user',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin(
        apiClient,
        config
      );

      const firstCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(firstCreate).toHaveStatusCode(200);
      expect(firstCreate.body.accessControl.owner).toBe(adminProfileId);
      const firstObjId = firstCreate.body.id;

      const secondCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(secondCreate).toHaveStatusCode(200);
      expect(secondCreate.body.accessControl.owner).toBe(adminProfileId);
      const secondObjId = secondCreate.body.id;

      const { cookieHeader: testUserCookie } = await loginAsNotObjectOwner(
        apiClient,
        ACCESS_CONTROL_EDITOR_USERNAME,
        ACCESS_CONTROL_EDITOR_PASSWORD
      );

      const toImport = [
        buildImportObject({
          id: firstObjId,
          accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
          profileUid: adminProfileId,
        }),
        buildImportObject({
          id: secondObjId,
          accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
          profileUid: adminProfileId,
        }),
        { ...EXCLUDED_META, exportedCount: 2 },
      ];

      const response = await importObjects(apiClient, testUserCookie, toImport, {
        overwrite: true,
        createNewCopies: false,
      });
      expect(response).toHaveStatusCode(403);
      expect(response.body.statusCode).toBe(403);
      expect(response.body.error).toBe('Forbidden');
      expect(response.body.message).toContain(
        `Unable to bulk_create ${ACCESS_CONTROL_TYPE}. Access control restrictions for objects:`
      );
      expect(response.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${firstObjId}`);
      expect(response.body.message).toContain(`${ACCESS_CONTROL_TYPE}:${secondObjId}`);
      expect(response.body.message).toContain(
        `The "manage_access_control" privilege is required to affect write restricted objects owned by another user.`
      );
    }
  );

  apiTest(
    'should allow overwrite of owned objects, but maintain original access control metadata, if owned by the current user',
    async ({ apiClient }) => {
      const { cookieHeader: testUserCookie, profileUid: testProfileId } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );

      const createResponse = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(testUserCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body.attributes.description).toBe('test');
      expect(createResponse.body.accessControl.accessMode).toBe('write_restricted');
      expect(createResponse.body.accessControl.owner).toBe(testProfileId);

      const toImport = [
        buildImportObject({
          id: createResponse.body.id,
          accessControl: { accessMode: 'default', owner: 'some_user' },
          description: 'overwritten',
          profileUid: testProfileId,
        }),
        EXCLUDED_META,
      ];

      const response = await importObjects(apiClient, testUserCookie, toImport, {
        overwrite: true,
        createNewCopies: false,
      });
      expect(response).toHaveStatusCode(200);
      const results = response.body.successResults;
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ACCESS_CONTROL_TYPE);
      expect(results[0].overwrite).toBe(true);

      const getResponse = await apiClient.get(accessControlObjectPath(results[0].id), {
        headers: withXsrf(testUserCookie),
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.attributes.description).toBe('overwritten');
      expect(getResponse.body.accessControl.accessMode).toBe('write_restricted');
      expect(getResponse.body.accessControl.owner).toBe(testProfileId);
    }
  );

  apiTest(
    'should allow overwrite of owned objects, but maintain original access control metadata, if admin',
    async ({ apiClient, config }) => {
      const { cookieHeader: testUserCookie, profileUid: testProfileId } = await loginAsObjectOwner(
        apiClient,
        TEST_USER_USERNAME,
        TEST_USER_PASSWORD
      );

      const createResponse = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(testUserCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(createResponse).toHaveStatusCode(200);
      expect(createResponse.body.attributes.description).toBe('test');
      expect(createResponse.body.accessControl.accessMode).toBe('write_restricted');
      expect(createResponse.body.accessControl.owner).toBe(testProfileId);

      const { cookieHeader: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin(
        apiClient,
        config
      );
      expect(adminProfileId).not.toBe(testProfileId);

      const toImport = [
        buildImportObject({
          id: createResponse.body.id,
          accessControl: { accessMode: 'default', owner: 'some_user' },
          description: 'overwritten',
          profileUid: testProfileId,
        }),
        EXCLUDED_META,
      ];

      const response = await importObjects(apiClient, adminCookie, toImport, {
        overwrite: true,
        createNewCopies: false,
      });
      expect(response).toHaveStatusCode(200);
      const results = response.body.successResults;
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe(ACCESS_CONTROL_TYPE);
      expect(results[0].overwrite).toBe(true);
      expect(results[0].id).toBe(createResponse.body.id);

      const getResponse = await apiClient.get(accessControlObjectPath(results[0].id), {
        headers: withXsrf(testUserCookie),
      });
      expect(getResponse).toHaveStatusCode(200);
      expect(getResponse.body.attributes.description).toBe('overwritten');
      expect(getResponse.body.accessControl.accessMode).toBe('write_restricted');
      expect(getResponse.body.accessControl.owner).toBe(testProfileId);
    }
  );

  apiTest('should retain all access control metadata on export', async ({ apiClient }) => {
    const { cookieHeader: testUserCookie, profileUid: testProfileId } = await loginAsObjectOwner(
      apiClient,
      TEST_USER_USERNAME,
      TEST_USER_PASSWORD
    );

    const acCreate = await apiClient.post(CREATE_PATH, {
      headers: withXsrf(testUserCookie),
      body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
    });
    expect(acCreate).toHaveStatusCode(200);
    expect(acCreate.body.accessControl.accessMode).toBe('write_restricted');
    expect(acCreate.body.accessControl.owner).toBe(testProfileId);
    const readOnlyId = acCreate.body.id;

    const nonAcCreate = await apiClient.post(CREATE_PATH, {
      headers: withXsrf(testUserCookie),
      body: { type: NON_ACCESS_CONTROL_TYPE },
    });
    expect(nonAcCreate).toHaveStatusCode(200);
    expect(nonAcCreate.body.accessControl).toBeUndefined();
    const nonReadOnlyId = nonAcCreate.body.id;

    // The export endpoint responds with NDJSON, not JSON: request the raw body as a buffer.
    const exportResponse = await apiClient.post('/api/saved_objects/_export', {
      headers: withXsrf(testUserCookie),
      responseType: 'buffer',
      body: {
        objects: [
          { type: ACCESS_CONTROL_TYPE, id: readOnlyId },
          { type: NON_ACCESS_CONTROL_TYPE, id: nonReadOnlyId },
        ],
      },
    });
    expect(exportResponse).toHaveStatusCode(200);
    const results = exportResponse.body
      .toString('utf8')
      .split('\n')
      .map((line: string) => JSON.parse(line));
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(3);

    expect(results[0].id).toBe(readOnlyId);
    expect(results[0].accessControl.accessMode).toBe('write_restricted');
    expect(results[0].accessControl.owner).toBe(testProfileId);

    expect(results[1].id).toBe(nonReadOnlyId);
    expect(results[1].accessControl).toBeUndefined();

    expect(results[2].exportedCount).toBe(2);
  });

  apiTest(
    `should allow 'createNewCopies' global option on resolve import errors`,
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin(
        apiClient,
        config
      );

      const adminCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(adminCreate).toHaveStatusCode(200);
      expect(adminCreate.body.accessControl.owner).toBe(adminProfileId);
      const adminObjId = adminCreate.body.id;

      const { cookieHeader: testUserCookie, profileUid: testProfileId } =
        await loginAsNotObjectOwner(apiClient, TEST_USER_USERNAME, TEST_USER_PASSWORD);
      const testUserCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(testUserCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(testUserCreate).toHaveStatusCode(200);
      expect(testUserCreate.body.accessControl.owner).toBe(testProfileId);
      const testUserObjId = testUserCreate.body.id;

      const toImport = [
        buildImportObject({
          id: testUserObjId,
          accessControl: { accessMode: 'write_restricted', owner: testProfileId },
          profileUid: testProfileId,
        }),
        buildImportObject({
          id: adminObjId,
          accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
          profileUid: adminProfileId,
        }),
        { ...EXCLUDED_META, exportedCount: 2 },
      ];

      const response = await resolveImportErrors(
        apiClient,
        testUserCookie,
        toImport,
        [
          { type: ACCESS_CONTROL_TYPE, id: testUserObjId, overwrite: true, replaceReferences: [] },
          { type: ACCESS_CONTROL_TYPE, id: adminObjId, overwrite: true, replaceReferences: [] },
        ],
        { createNewCopies: true }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.successCount).toBe(2);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.successResults)).toBe(true);
      expect(response.body.successResults).toHaveLength(2);

      expect(response.body.successResults[0].type).toBe(ACCESS_CONTROL_TYPE);
      expect(response.body.successResults[0].id).toBe(testUserObjId);
      expect(response.body.successResults[0].managed).toBe(false);
      expect(response.body.successResults[0].overwrite).toBe(true);
      expect(response.body.successResults[0].destinationId).toBeDefined();

      expect(response.body.successResults[1].type).toBe(ACCESS_CONTROL_TYPE);
      expect(response.body.successResults[1].id).toBe(adminObjId);
      expect(response.body.successResults[1].managed).toBe(false);
      expect(response.body.successResults[1].overwrite).toBe(true);
      expect(response.body.successResults[1].destinationId).toBeDefined();
    }
  );

  apiTest(
    'should disallow overwrite retry for write-restricted objects not owned by the current user',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin(
        apiClient,
        config
      );

      const adminCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(adminCreate).toHaveStatusCode(200);
      expect(adminCreate.body.accessControl.owner).toBe(adminProfileId);
      const adminObjId = adminCreate.body.id;

      const { cookieHeader: testUserCookie, profileUid: testProfileId } =
        await loginAsNotObjectOwner(
          apiClient,
          ACCESS_CONTROL_EDITOR_USERNAME,
          ACCESS_CONTROL_EDITOR_PASSWORD
        );
      const testUserCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(testUserCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(testUserCreate).toHaveStatusCode(200);
      expect(testUserCreate.body.accessControl.owner).toBe(testProfileId);
      const testUserObjId = testUserCreate.body.id;

      const toImport = [
        buildImportObject({
          id: testUserObjId,
          accessControl: { accessMode: 'write_restricted', owner: testProfileId },
          profileUid: testProfileId,
        }),
        buildImportObject({
          id: adminObjId,
          accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
          profileUid: adminProfileId,
        }),
        { ...EXCLUDED_META, exportedCount: 2 },
      ];

      const response = await resolveImportErrors(
        apiClient,
        testUserCookie,
        toImport,
        [
          { type: ACCESS_CONTROL_TYPE, id: testUserObjId, overwrite: true, replaceReferences: [] },
          { type: ACCESS_CONTROL_TYPE, id: adminObjId, overwrite: true, replaceReferences: [] },
        ],
        { createNewCopies: false }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.successCount).toBe(1);
      expect(response.body.success).toBe(false);
      expect(response.body.successResults).toStrictEqual([
        {
          type: ACCESS_CONTROL_TYPE,
          id: testUserObjId,
          meta: {},
          managed: false,
          overwrite: true,
        },
      ]);
      expect(response.body.errors).toStrictEqual([
        {
          id: adminObjId,
          type: ACCESS_CONTROL_TYPE,
          meta: {},
          error: OVERWRITE_FORBIDDEN_ERROR,
          overwrite: true,
        },
      ]);
    }
  );

  apiTest(
    'should disallow create new retry with same ID for write-restricted objects not owned by the current user',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin(
        apiClient,
        config
      );

      const adminCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(adminCreate).toHaveStatusCode(200);
      expect(adminCreate.body.accessControl.owner).toBe(adminProfileId);
      const adminObjId = adminCreate.body.id;

      const { cookieHeader: testUserCookie, profileUid: testProfileId } =
        await loginAsNotObjectOwner(apiClient, TEST_USER_USERNAME, TEST_USER_PASSWORD);
      const testUserCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(testUserCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(testUserCreate).toHaveStatusCode(200);
      expect(testUserCreate.body.accessControl.owner).toBe(testProfileId);
      const testUserObjId = testUserCreate.body.id;

      const toImport = [
        buildImportObject({
          id: testUserObjId,
          accessControl: { accessMode: 'write_restricted', owner: testProfileId },
          profileUid: testProfileId,
        }),
        buildImportObject({
          id: adminObjId,
          accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
          profileUid: adminProfileId,
        }),
        { ...EXCLUDED_META, exportedCount: 2 },
      ];

      const response = await resolveImportErrors(
        apiClient,
        testUserCookie,
        toImport,
        [
          { type: ACCESS_CONTROL_TYPE, id: testUserObjId, overwrite: true, replaceReferences: [] },
          {
            type: ACCESS_CONTROL_TYPE,
            id: adminObjId,
            overwrite: false,
            createNewCopy: true,
            replaceReferences: [],
          },
        ],
        { createNewCopies: false }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.successCount).toBe(1);
      expect(response.body.success).toBe(false);
      expect(response.body.successResults).toStrictEqual([
        {
          type: ACCESS_CONTROL_TYPE,
          id: testUserObjId,
          meta: {},
          managed: false,
          overwrite: true,
        },
      ]);
      expect(response.body.errors).toStrictEqual([
        {
          id: adminObjId,
          type: ACCESS_CONTROL_TYPE,
          meta: {},
          error: { type: 'conflict' },
        },
      ]);
    }
  );

  apiTest(
    'should allow create new retry with destination ID for write-restricted objects not owned by the current user',
    async ({ apiClient, config }) => {
      const { cookieHeader: adminCookie, profileUid: adminProfileId } = await loginAsKibanaAdmin(
        apiClient,
        config
      );

      const adminCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(adminCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(adminCreate).toHaveStatusCode(200);
      expect(adminCreate.body.accessControl.owner).toBe(adminProfileId);
      const adminObjId = adminCreate.body.id;

      const { cookieHeader: testUserCookie, profileUid: testProfileId } =
        await loginAsNotObjectOwner(apiClient, TEST_USER_USERNAME, TEST_USER_PASSWORD);
      const testUserCreate = await apiClient.post(CREATE_PATH, {
        headers: withXsrf(testUserCookie),
        body: { type: ACCESS_CONTROL_TYPE, isWriteRestricted: true },
      });
      expect(testUserCreate).toHaveStatusCode(200);
      expect(testUserCreate.body.accessControl.owner).toBe(testProfileId);
      const testUserObjId = testUserCreate.body.id;

      const toImport = [
        buildImportObject({
          id: testUserObjId,
          accessControl: { accessMode: 'write_restricted', owner: testProfileId },
          profileUid: testProfileId,
        }),
        buildImportObject({
          id: adminObjId,
          accessControl: { accessMode: 'write_restricted', owner: adminProfileId },
          profileUid: adminProfileId,
        }),
        { ...EXCLUDED_META, exportedCount: 2 },
      ];

      const destinationId = `${adminObjId}_new`;

      const response = await resolveImportErrors(
        apiClient,
        testUserCookie,
        toImport,
        [
          { type: ACCESS_CONTROL_TYPE, id: testUserObjId, overwrite: true, replaceReferences: [] },
          {
            type: ACCESS_CONTROL_TYPE,
            id: adminObjId,
            overwrite: false,
            createNewCopy: true,
            replaceReferences: [],
            destinationId,
          },
        ],
        { createNewCopies: false }
      );
      expect(response).toHaveStatusCode(200);
      expect(response.body.successCount).toBe(2);
      expect(response.body.success).toBe(true);
      expect(response.body.successResults).toStrictEqual([
        {
          type: ACCESS_CONTROL_TYPE,
          id: testUserObjId,
          meta: {},
          managed: false,
          overwrite: true,
        },
        {
          type: ACCESS_CONTROL_TYPE,
          id: adminObjId,
          destinationId,
          meta: {},
          managed: false,
          createNewCopy: true,
        },
      ]);
    }
  );
});
