/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { parse as parseCookie } from 'tough-cookie';

import {
  createSAMLResponse,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
  MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN,
  MOCK_IDP_UIAM_SERVICE_URL,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { COMMON_HEADERS, extractAttributeValue } from '../fixtures';

// These tests cannot be run on MKI because we cannot obtain the raw UIAM tokens required to verify their invalidation.
apiTest.describe(
  '[NON-MKI] Invalidate UIAM session',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let userSessionCookieFactory: () => Promise<
      [string, { accessToken: string; refreshToken: string }]
    >;
    apiTest.beforeAll(async ({ apiClient, kbnUrl, config: { organizationId, projectType } }) => {
      userSessionCookieFactory = async () => {
        const samlResponse = await createSAMLResponse({
          kibanaUrl: kbnUrl.get('/api/security/saml/callback'),
          username: '1234567890',
          email: 'elastic_viewer@elastic.co',
          roles: ['viewer'],
          serverless: {
            uiamEnabled: true,
            organizationId: organizationId!,
            projectType: projectType!,
          },
        });

        const decodedSamlResponse = Buffer.from(samlResponse, 'base64').toString('utf-8');
        return [
          parseCookie(
            (
              await apiClient.post('api/security/saml/callback', {
                body: `SAMLResponse=${encodeURIComponent(samlResponse)}`,
              })
            ).headers['set-cookie'][0]
          )!.cookieString(),
          {
            accessToken: extractAttributeValue(
              decodedSamlResponse,
              MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN
            ),
            refreshToken: extractAttributeValue(
              decodedSamlResponse,
              MOCK_IDP_ATTRIBUTE_UIAM_REFRESH_TOKEN
            ),
          },
        ];
      };
    });

    apiTest(
      'UIAM session tokens should not be usable after logging out',
      async ({ apiClient, log }) => {
        // 1. Check that session is valid and UIAM accepts the tokens.
        const [userSessionCookie, { accessToken, refreshToken }] = await userSessionCookieFactory();
        let response = await apiClient.get('internal/security/me', {
          headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));
        // Check only access token here, refresh token will be checked after logout.
        expect((await checkUiamAccessToken(accessToken)).status).toBe(200);

        // 2. Logout to invalidate the session and tokens.
        response = await apiClient.get('api/security/logout', {
          headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(302);

        log.info('Waiting for the UIAM refresh 3s grace period to lapse (+5s)…');
        await setTimeoutAsync(5000);
        log.info('UIAM refresh grace period wait time is over, making the request again.');

        // 3. Check that session is invalidated and UIAM no longer accepts the tokens.
        response = await apiClient.get('internal/security/me', {
          headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(401);
        expect((await checkUiamAccessToken(accessToken)).status).toBe(401);
        expect((await checkUiamRefreshToken(refreshToken)).status).toBe(401);
      }
    );
  }
);

const checkUiamAccessToken = async (accessToken: string) =>
  await fetch(`${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/authentication/_authenticate`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Kibana-Scout/1.0 (IntegrationTest; Security; build/2025.12.30)',
      'Content-Type': 'application/json',
      [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_UIAM_SHARED_SECRET,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  });

const checkUiamRefreshToken = async (refreshToken: string) =>
  await fetch(`${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/tokens/_refresh`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Kibana-Scout/1.0 (IntegrationTest; Security; build/2025.12.30)',
      'Content-Type': 'application/json',
      [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_UIAM_SHARED_SECRET,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
