/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, EsClient, KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

/** Saved-object types registered by the `access_control_test_plugin`. */
export const ACCESS_CONTROL_TYPE = 'access_control_type';
export const NON_ACCESS_CONTROL_TYPE = 'non_access_control_type';

/** Routes exposed by the `access_control_test_plugin`. */
export const CREATE_PATH = '/access_control_objects/create';
export const BULK_CREATE_PATH = '/access_control_objects/bulk_create';
export const UPDATE_PATH = '/access_control_objects/update';
export const BULK_UPDATE_PATH = '/access_control_objects/bulk_update';
export const BULK_DELETE_PATH = '/access_control_objects/bulk_delete';
export const CHANGE_OWNER_PATH = '/access_control_objects/change_owner';
export const CHANGE_MODE_PATH = '/access_control_objects/change_access_mode';
export const objectPath = (id: string): string => `/access_control_objects/${id}`;
export const nonAccessControlObjectPath = (id: string): string =>
  `/non_access_control_objects/${id}`;

/**
 * The 403 body returned when a non-owner without `manage_access_control` writes to a
 * write-restricted object; the message differs only by operation verb.
 */
export const accessControlForbiddenError = (
  verb: 'Overwriting' | 'Updating' | 'Deleting'
): { statusCode: number; error: string; message: string } => ({
  statusCode: 403,
  error: 'Forbidden',
  message: `${verb} objects in "write_restricted" mode that are owned by another user requires the "manage_access_control" privilege.`,
});

/** Create-route response body; access-control metadata is absent for non-access-control types. */
export interface CreatedObjectBody {
  id: string;
  type: string;
  accessControl?: { owner: string; accessMode: string };
}

/** Creates one object via the test-plugin create route, asserting success. */
export const createOwnedObject = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  body: Record<string, unknown>
): Promise<{ id: string; type: string; body: CreatedObjectBody }> => {
  const res = await apiClient.post(CREATE_PATH, { headers: withXsrf(cookieHeader), body });
  expect(res).toHaveStatusCode(200);
  return { id: res.body.id as string, type: res.body.type as string, body: res.body };
};

/** Kibana admin (superuser). */
export const ADMIN_USERNAME = 'elastic';
export const ADMIN_PASSWORD = 'changeme';

/**
 * Non-admin object owner used across the suites; provisioned as a native user with the
 * `kibana_savedobjects_editor` role.
 */
export const TEST_USER_USERNAME = 'test_user';
export const TEST_USER_PASSWORD = 'changeme';

/** Non-owner with enough privileges to call the APIs, but without `manage_access_control`. */
export const ACCESS_CONTROL_EDITOR_USERNAME = 'access_control_editor';
export const ACCESS_CONTROL_EDITOR_PASSWORD = 'changeme';

export const SIMPLE_USER_USERNAME = 'simple_user';
export const SIMPLE_USER_PASSWORD = 'changeme';

/**
 * Custom Kibana role granting `dev_tools` + `savedObjectsManagement` across all spaces (but NOT
 * `manage_access_control`).
 */
export const SAVED_OBJECTS_EDITOR_ROLE = 'kibana_savedobjects_editor';

export interface LoginResult {
  /** Ready-to-send cookie header, e.g. `{ Cookie: 'sid=...' }`. */
  cookieHeader: Record<string, string>;
  profileUid: string;
}

/**
 * Basic (non-SAML) interactive login against the running Kibana. Returns the session cookie header
 * and the caller's user profile id. Targets Scout's `cloud-basic` provider (the default stateful
 * config registers `basic: { 'cloud-basic': { order: 1 } }`).
 *
 * Deliberately NOT `samlAuth.asInteractiveUser`: these suites need several concurrently-valid
 * sessions for distinct users with stable profile uids, which the single custom-role slot per
 * worker cannot provide.
 */
export const login = async (
  apiClient: ApiClientFixture,
  username: string,
  password: string
): Promise<LoginResult> => {
  const loginResponse = await apiClient.post('/internal/security/login', {
    headers: { 'kbn-xsrf': 'true' },
    body: {
      providerType: 'basic',
      providerName: 'cloud-basic',
      currentURL: '/',
      params: { username, password },
    },
  });
  if (loginResponse.statusCode !== 200) {
    throw new Error(
      `Login for "${username}" failed with ${loginResponse.statusCode}: ${JSON.stringify(
        loginResponse.body
      )}`
    );
  }

  const setCookie = loginResponse.headers['set-cookie'];
  const rawCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!rawCookie) {
    throw new Error(`Login for "${username}" did not return a session cookie`);
  }
  // `set-cookie` looks like `sid=<value>; Path=/; ...`; only the leading `name=value` pair is
  // needed when echoing the cookie back on subsequent requests.
  const cookieValue = rawCookie.split(';')[0];
  const cookieHeader = { Cookie: cookieValue };

  const meResponse = await apiClient.get('/internal/security/me', { headers: cookieHeader });
  if (meResponse.statusCode !== 200) {
    throw new Error(
      `Fetching profile for "${username}" failed with ${meResponse.statusCode}: ${JSON.stringify(
        meResponse.body
      )}`
    );
  }

  return { cookieHeader, profileUid: meResponse.body.profile_uid };
};

export const loginAsKibanaAdmin = (apiClient: ApiClientFixture): Promise<LoginResult> =>
  login(apiClient, ADMIN_USERNAME, ADMIN_PASSWORD);

export const loginAsObjectOwner = (
  apiClient: ApiClientFixture,
  username: string,
  password: string
): Promise<LoginResult> => login(apiClient, username, password);

/** Same as {@link loginAsObjectOwner}; separate name only for call-site readability. */
export const loginAsNotObjectOwner = loginAsObjectOwner;

/** Basic auth header for `elastic`, used for the "no active user profile" cases. */
export const adminBasicAuthHeader = (): Record<string, string> => ({
  Authorization: `Basic ${Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64')}`,
});

/** Merges the mandatory `kbn-xsrf` header with any auth headers (cookie or basic). */
export const withXsrf = (authHeader: Record<string, string>): Record<string, string> => ({
  'kbn-xsrf': 'true',
  ...authHeader,
});

/**
 * Creates/updates the `simple_user` native user with the given roles (default `['viewer']`).
 * Used to grant then revoke privileges mid-test. Mutates a single shared user, so these suites
 * must keep Playwright's serial defaults (`workers: 1`, no `fullyParallel`).
 */
export const createSimpleUser = async (
  esClient: EsClient,
  roles: string[] = ['viewer']
): Promise<void> => {
  await esClient.security.putUser({
    username: SIMPLE_USER_USERNAME,
    refresh: 'wait_for',
    password: SIMPLE_USER_PASSWORD,
    roles,
  });
};

/** Creates the `access_control_editor` user (editor role, no `manage_access_control`). */
export const createAccessControlEditorUser = async (esClient: EsClient): Promise<void> => {
  await esClient.security.putUser({
    username: ACCESS_CONTROL_EDITOR_USERNAME,
    refresh: 'wait_for',
    password: ACCESS_CONTROL_EDITOR_PASSWORD,
    roles: [SAVED_OBJECTS_EDITOR_ROLE],
  });
};

/** Creates the `test_user` object-owner user (editor role). */
export const createTestUser = async (esClient: EsClient): Promise<void> => {
  await esClient.security.putUser({
    username: TEST_USER_USERNAME,
    refresh: 'wait_for',
    password: TEST_USER_PASSWORD,
    roles: [SAVED_OBJECTS_EDITOR_ROLE],
  });
};

/**
 * Activates `simple_user`'s profile without an interactive login, returning its profile id.
 */
export const activateSimpleUserProfile = async (
  esClient: EsClient
): Promise<{ profileUid: string }> => {
  const response = await esClient.security.activateUserProfile({
    grant_type: 'password',
    username: SIMPLE_USER_USERNAME,
    password: SIMPLE_USER_PASSWORD,
  });
  return { profileUid: response.uid };
};

/**
 * Creates the `kibana_savedobjects_editor` Kibana role at runtime via the Kibana role API
 * (Scout has no server-side role catalog).
 */
export const ensureSavedObjectsEditorRole = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    method: 'PUT',
    path: `/api/security/role/${SAVED_OBJECTS_EDITOR_ROLE}`,
    body: {
      kibana: [
        {
          base: [],
          feature: { dev_tools: ['all'], savedObjectsManagement: ['all'] },
          spaces: ['*'],
        },
      ],
    },
  });
};

/**
 * Provisions the role + the always-present users (`test_user`, `access_control_editor`, and
 * `simple_user` as a viewer). Individual tests re-`createSimpleUser` to change its privileges.
 */
export const setupAccessControlUsers = async ({
  esClient,
  kbnClient,
}: {
  esClient: EsClient;
  kbnClient: KbnClient;
}): Promise<void> => {
  await ensureSavedObjectsEditorRole(kbnClient);
  await createTestUser(esClient);
  await createAccessControlEditorUser(esClient);
  await createSimpleUser(esClient);
};
