/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';
import { Agent } from 'undici';

import {
  deriveInternalCallerAttestation,
  HTTPAuthorizationHeader,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
} from '@kbn/core-security-server';
import {
  createSAMLResponse,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
  MOCK_IDP_UIAM_ORG_ADMIN_API_KEY,
  MOCK_IDP_UIAM_SERVICE_URL,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { COMMON_HEADERS, COMMON_UNSAFE_HEADERS, extractAttributeValue } from '../fixtures';

// These tests cannot be run on MKI because we cannot obtain the raw UIAM tokens and spin up Mock IdP plugin.
apiTest.describe(
  '[NON-MKI] Use UIAM credentials for various purposes in real and fake requests',
  { tag: tags.serverless.all },
  () => {
    let userSessionCookieFactory: () => Promise<[string, { accessToken: string }]>;

    apiTest.beforeAll(async ({ apiClient, config: { organizationId, projectType } }) => {
      userSessionCookieFactory = async () => {
        const samlResponse = await createSAMLResponse({
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

    apiTest(
      'should be able to use non-internal/global UIAM API key against Kibana APIs',
      async ({ apiClient }) => {
        const response = await apiClient.get('internal/security/me', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(
          expect.objectContaining({
            api_key: expect.objectContaining({ managed_by: 'cloud', internal: false }),
            authentication_realm: { name: '_cloud_api_key', type: '_cloud_api_key' },
            roles: ['admin'],
          })
        );
      }
    );

    apiTest(
      'should be able to use internal UIAM API key on a real request WITH a valid attestation',
      async ({ apiClient }) => {
        // 1. Log in and grant an internal UIAM (essu_) API key.
        const [_, { accessToken }] = await userSessionCookieFactory();
        const internalUiamApiKeyResponse = await grantUiamApiKey(accessToken);
        expect(internalUiamApiKeyResponse.status).toBe(200);

        // 2. A real request carrying the internal key AND a valid attestation succeeds: the ES
        // cluster client re-attaches the shared secret on the request's behalf.
        const credential = new HTTPAuthorizationHeader(
          'ApiKey',
          (await internalUiamApiKeyResponse.json()).key
        );
        const response = await apiClient.get('internal/security/me', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: credential.toString(),
            [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
              MOCK_IDP_UIAM_SHARED_SECRET,
              credential
            ),
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(
          expect.objectContaining({ api_key: expect.objectContaining({ internal: true }) })
        );
      }
    );

    apiTest(
      'should reject an internal UIAM API key on a real request WITHOUT an attestation',
      async ({ apiClient }) => {
        const [_, { accessToken }] = await userSessionCookieFactory();
        const internalUiamApiKeyResponse = await grantUiamApiKey(accessToken);
        expect(internalUiamApiKeyResponse.status).toBe(200);

        const response = await apiClient.get('internal/security/me', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `ApiKey ${(await internalUiamApiKeyResponse.json()).key}`,
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(401);
      }
    );

    apiTest(
      'should reject an internal UIAM API key on a real request with a wrong attestation',
      async ({ apiClient }) => {
        const [_, { accessToken }] = await userSessionCookieFactory();
        const internalUiamApiKeyResponse = await grantUiamApiKey(accessToken);
        expect(internalUiamApiKeyResponse.status).toBe(200);

        const credential = new HTTPAuthorizationHeader(
          'ApiKey',
          (await internalUiamApiKeyResponse.json()).key
        );
        const response = await apiClient.get('internal/security/me', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: credential.toString(),
            [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
              'a-different-shared-secret',
              credential
            ),
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(401);
      }
    );

    apiTest(
      'should reject an internal UIAM API key on a real request with an attestation bound to another key',
      async ({ apiClient }) => {
        const [_, { accessToken }] = await userSessionCookieFactory();
        const [internalUiamApiKeyResponse, otherInternalUiamApiKeyResponse] = await Promise.all([
          grantUiamApiKey(accessToken),
          grantUiamApiKey(accessToken),
        ]);
        expect(internalUiamApiKeyResponse.status).toBe(200);
        expect(otherInternalUiamApiKeyResponse.status).toBe(200);

        // The attestation is genuine, but minted for a different credential, so it must not
        // authorize this one.
        const response = await apiClient.get('internal/security/me', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `ApiKey ${(await internalUiamApiKeyResponse.json()).key}`,
            [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
              MOCK_IDP_UIAM_SHARED_SECRET,
              new HTTPAuthorizationHeader(
                'ApiKey',
                (
                  await otherInternalUiamApiKeyResponse.json()
                ).key
              )
            ),
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(401);
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
    // @ts-expect-error Undici `fetch` supports `dispatcher` option, see https://github.com/nodejs/undici/pull/1411.
    dispatcher: new Agent({ connect: { rejectUnauthorized: false } }),
  });
