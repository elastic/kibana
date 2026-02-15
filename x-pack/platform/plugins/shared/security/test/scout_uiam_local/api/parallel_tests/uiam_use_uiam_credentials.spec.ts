/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';

import {
  createSAMLResponse,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
  MOCK_IDP_UIAM_SERVICE_URL,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { COMMON_HEADERS, COMMON_UNSAFE_HEADERS, extractAttributeValue } from '../fixtures';

// These tests cannot be run on MKI because we cannot obtain the raw UIAM tokens and spin up Mock IdP plugin.
apiTest.describe(
  '[NON-MKI] Use internal UIAM credentials for various purposes in real and fake requests',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let userSessionCookieFactory: () => Promise<[string, { accessToken: string }]>;
    apiTest.beforeAll(async ({ apiClient, kbnUrl, config: { organizationId, projectType } }) => {
      userSessionCookieFactory = async () => {
        const samlResponse = await createSAMLResponse({
          kibanaUrl: kbnUrl.get('/api/security/saml/callback'),
          username: '1234567890',
          email: 'elastic_admin@elastic.co',
          roles: ['admin'],
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
          },
        ];
      };
    });

    apiTest(
      'should be able to use internal UIAM API key in fake requests',
      async ({ apiClient }) => {
        // 1. Log in to obtain an UIAM access token.
        const [_, { accessToken }] = await userSessionCookieFactory();

        // 2. Grant an internal API key using the UIAM access token .
        const internalUiamApiKeyResponse = await grantUiamApiKey(accessToken);
        expect(internalUiamApiKeyResponse.status).toBe(200);
        const internalUiamApiKey = await internalUiamApiKeyResponse.json();

        // 3. Verify that the granted API key can be used in fake requests.
        const response = await apiClient.post('test_endpoints/uiam/scoped_client/_call', {
          headers: { ...COMMON_UNSAFE_HEADERS },
          responseType: 'json',
          body: { apiKey: internalUiamApiKey.key },
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(
          expect.objectContaining({ username: internalUiamApiKey.id })
        );
      }
    );

    apiTest(
      'should be able to use internal UIAM credentials to grant and invalidate native Elasticsearch API keys',
      async ({ apiClient }) => {
        // 1. Log in to obtain a session cookie tied to an UIAM access token.
        const [userSessionCookie] = await userSessionCookieFactory();

        // 2. Grant a native Elasticsearch API key.
        const nativeApiKeyResponse = await apiClient.post('test_endpoints/api_keys/_grant', {
          headers: { ...COMMON_UNSAFE_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
          body: {},
        });
        expect(nativeApiKeyResponse.statusCode).toBe(200);

        // 3. Verify that the API key works.
        let response = await apiClient.get('internal/security/me', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `ApiKey ${nativeApiKeyResponse.body.encoded}`,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));

        // 4. Invalidate the API key.
        response = await apiClient.post('test_endpoints/api_keys/_invalidate', {
          headers: { ...COMMON_UNSAFE_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
          body: { ids: [nativeApiKeyResponse.body.id] },
        });
        expect(response.statusCode).toBe(200);

        expect(response.body).toStrictEqual(
          expect.objectContaining({
            invalidated_api_keys: [nativeApiKeyResponse.body.id],
            error_count: 0,
          })
        );

        // 5. Verify that the API key no longer works.
        response = await apiClient.get('internal/security/me', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `ApiKey ${nativeApiKeyResponse.body.encoded}`,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(401);
      }
    );

    apiTest(
      'should be able to use internal UIAM session token as secondary credentials',
      async ({ apiClient }) => {
        // 1. Log in to obtain a session cookie tied to an UIAM access token.
        const [userSessionCookie] = await userSessionCookieFactory();

        // 2. Verify that credentials can be used as secondary credentials.
        const response = await apiClient.post('test_endpoints/uiam/secondary_auth', {
          headers: { ...COMMON_UNSAFE_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
          body: {},
        });
        expect(response.statusCode).toBe(200);
        expect(response.body._total.num_docs).toBeGreaterThan(0);
      }
    );

    apiTest(
      'should be able to use internal UIAM API key as secondary credentials',
      async ({ apiClient }) => {
        // 1. Log in to obtain an UIAM access token.
        const [_, { accessToken }] = await userSessionCookieFactory();

        // 2. Grant an internal API key using the UIAM access token .
        const internalUiamApiKeyResponse = await grantUiamApiKey(accessToken);
        expect(internalUiamApiKeyResponse.status).toBe(200);

        // 2. Verify that credentials can be used as secondary credentials.
        const response = await apiClient.post('test_endpoints/uiam/secondary_auth', {
          headers: { ...COMMON_UNSAFE_HEADERS },
          responseType: 'json',
          body: { apiKey: (await internalUiamApiKeyResponse.json()).key },
        });
        expect(response.statusCode).toBe(200);
        expect(response.body._total.num_docs).toBeGreaterThan(0);
      }
    );
  }
);

const grantUiamApiKey = async (accessToken: string) =>
  await fetch(`${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/api-keys/_grant`, {
    method: 'POST',
    headers: {
      'User-Agent': 'Kibana-Scout/1.0 (IntegrationTest; Security; build/2025.12.30)',
      'Content-Type': 'application/json',
      [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_UIAM_SHARED_SECRET,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      description: 'test key',
      internal: true,
      role_assignments: { limit: { access: ['application'], resource: ['project'] } },
    }),
  });
