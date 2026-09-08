/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, ApiClientResponse } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ALERTING_V2_INTERNAL_SUGGESTIONS_USER_PROFILES_API_PATH } from '@kbn/alerting-v2-constants';
import { suggestUserProfilesResponseSchema } from '@kbn/alerting-v2-schemas';
import { apiTest, testData } from '../fixtures';

const USER_PROFILES_PATH = ALERTING_V2_INTERNAL_SUGGESTIONS_USER_PROFILES_API_PATH;
// Used to resolve the username / uid of the authenticated user so assertions
// are not tied to hardcoded SAML test-user names.
const SECURITY_ME_PATH = '/internal/security/me';

const suggest = (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  body: Record<string, unknown>
): Promise<ApiClientResponse> =>
  apiClient.post(USER_PROFILES_PATH, { headers, body, responseType: 'json' });

apiTest.describe('Suggest user profiles API', { tag: '@local-stateful-classic' }, () => {
  let adminHeaders: Record<string, string>;
  let adminUserBody: Record<string, string>;
  let viewerUserBody: Record<string, string>;
  let sharedNameToken: string;

  apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
    const { cookieHeader: adminCookie } = await samlAuth.asInteractiveUser('admin');
    const { cookieHeader: viewerCookie } = await samlAuth.asInteractiveUser('viewer');

    adminHeaders = { ...adminCookie, ...testData.COMMON_HEADERS };

    const adminUser = await apiClient.get(SECURITY_ME_PATH, {
      headers: adminHeaders,
      responseType: 'json',
    });
    const viewerUser = await apiClient.get(SECURITY_ME_PATH, {
      headers: { ...viewerCookie, ...testData.COMMON_HEADERS },
      responseType: 'json',
    });

    expect(adminUser).toHaveStatusCode(200);
    expect(viewerUser).toHaveStatusCode(200);

    adminUserBody = adminUser.body;
    viewerUserBody = viewerUser.body;
    sharedNameToken = adminUserBody.full_name.split(' ')[0]; // Both admin and viewer have 'test' in their full_name, so this token should match both.
  });

  apiTest('returns suggested profiles', async ({ apiClient }) => {
    const response = await suggest(apiClient, adminHeaders, { name: sharedNameToken });

    const schemaParse = suggestUserProfilesResponseSchema.safeParse(response.body);
    expect(schemaParse.error?.issues ?? []).toStrictEqual([]);
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(
      expect.arrayContaining([
        {
          uid: adminUserBody.profile_uid,
          user: {
            email: adminUserBody.email,
            full_name: adminUserBody.full_name,
            username: adminUserBody.username,
          },
        },
        {
          uid: viewerUserBody.profile_uid,
          user: {
            email: viewerUserBody.email,
            full_name: viewerUserBody.full_name,
            username: viewerUserBody.username,
          },
        },
      ])
    );
  });

  apiTest('returns an empty array when nothing matches the name', async ({ apiClient }) => {
    const response = await suggest(apiClient, adminHeaders, {
      name: 'zzq-no-such-user-profile',
    });

    const schemaParse = suggestUserProfilesResponseSchema.safeParse(response.body);
    expect(schemaParse.error?.issues ?? []).toStrictEqual([]);
    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual([]);
  });

  apiTest('limits the number of returned profiles at the requested size', async ({ apiClient }) => {
    const response = await suggest(apiClient, adminHeaders, { name: sharedNameToken, size: 1 });

    const schemaParse = suggestUserProfilesResponseSchema.safeParse(response.body);
    expect(schemaParse.error?.issues ?? []).toStrictEqual([]);
    expect(response).toHaveStatusCode(200);
    expect(response.body).toHaveLength(1);
  });

  apiTest('validation: rejects a missing name with a 400', async ({ apiClient }) => {
    const response = await suggest(apiClient, adminHeaders, { size: 10 });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest('validation: rejects an empty name with a 400', async ({ apiClient }) => {
    const response = await suggest(apiClient, adminHeaders, { name: '' });

    expect(response).toHaveStatusCode(400);
    expect(response.body.code).toBe('BAD_REQUEST');
  });

  apiTest(
    'validation: rejects body with unknown top-level keys (strict schema)',
    async ({ apiClient }) => {
      const response = await suggest(apiClient, adminHeaders, {
        name: adminUserBody.username,
        unknownKey: 'anything',
      });

      expect(response).toHaveStatusCode(400);
      expect(response.body.code).toBe('BAD_REQUEST');
    }
  );
});
