/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';

import { createSAMLResponse, MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_UNSAFE_HEADERS, extractAttributeValue } from '../fixtures';

// These tests cannot be run on MKI because we cannot obtain the raw UIAM tokens and spin up Mock IdP plugin.
apiTest.describe(
  '[NON-MKI] UIAM API Keys grant and invalidate functions',
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
      'should be able to grant a UIAM API key with valid UIAM credentials',
      async ({ apiClient }) => {
        // 1. Log in to obtain a UIAM access token.
        const [_, { accessToken }] = await userSessionCookieFactory();

        // 2. Grant an API key using the UIAM access token via the test endpoint.
        const responseUsingAccessToken = await apiClient.post(
          'test_endpoints/uiam/api_keys/_grant',
          {
            headers: { ...COMMON_UNSAFE_HEADERS },
            responseType: 'json',
            body: {
              name: 'test-uiam-api-key-from-token',
              authcScheme: 'Bearer',
              credential: accessToken,
            },
          }
        );

        expect(responseUsingAccessToken).toHaveStatusCode(200);
        expect(responseUsingAccessToken.body.id).toBeDefined();
        expect(responseUsingAccessToken.body.name).toBe('test-uiam-api-key-from-token');
        expect(responseUsingAccessToken.body.api_key).toBeDefined();
        expect(typeof responseUsingAccessToken.body.api_key).toBe('string');
        expect(typeof responseUsingAccessToken.body.id).toBe('string');

        // 3. UIAM API Keys should be able to grant additional UIAM API keys.
        const apiKey = responseUsingAccessToken.body.api_key;

        const responseUsingApiKey = await apiClient.post('test_endpoints/uiam/api_keys/_grant', {
          headers: { ...COMMON_UNSAFE_HEADERS },
          responseType: 'json',
          body: {
            name: 'test-uiam-api-key-from-api-key',
            authcScheme: 'ApiKey',
            credential: apiKey,
          },
        });

        expect(responseUsingApiKey).toHaveStatusCode(200);
        expect(responseUsingApiKey.body.id).toBeDefined();
        expect(typeof responseUsingApiKey.body.id).toBe('string');
        expect(responseUsingApiKey.body.name).toBe('test-uiam-api-key-from-api-key');
        expect(responseUsingApiKey.body.api_key).toBeDefined();
        expect(typeof responseUsingApiKey.body.api_key).toBe('string');
      }
    );

    apiTest(
      'should be able to invalidate a UIAM API key with valid UIAM credentials',
      async ({ apiClient }) => {
        // 1. Log in to obtain a UIAM access token.
        const [_, { accessToken }] = await userSessionCookieFactory();

        // 2. Grant an API key first.
        const grantResponse = await apiClient.post('test_endpoints/uiam/api_keys/_grant', {
          headers: { ...COMMON_UNSAFE_HEADERS },
          responseType: 'json',
          body: {
            name: 'test-uiam-api-key-to-invalidate',
            authcScheme: 'Bearer',
            credential: accessToken,
          },
        });
        expect(grantResponse).toHaveStatusCode(200);

        const apiKeyId = grantResponse.body.id;
        const apiKey = grantResponse.body.api_key;

        // 3. Invalidate the API key.
        const invalidateResponse = await apiClient.post(
          'test_endpoints/uiam/api_keys/_invalidate',
          {
            headers: { ...COMMON_UNSAFE_HEADERS },
            responseType: 'json',
            body: {
              id: apiKeyId,
              authcScheme: 'ApiKey',
              credential: apiKey,
            },
          }
        );

        expect(invalidateResponse).toHaveStatusCode(200);
        expect(invalidateResponse.body).toStrictEqual(
          expect.objectContaining({
            invalidated_api_keys: [apiKeyId],
            error_count: 0,
          })
        );
      }
    );

    apiTest('should reject grant request with non-UIAM credentials', async ({ apiClient }) => {
      // Attempt to grant an API key using non-UIAM credentials.
      const response = await apiClient.post('test_endpoints/uiam/api_keys/_grant', {
        headers: { ...COMMON_UNSAFE_HEADERS },
        responseType: 'json',
        body: {
          name: 'test-invalid-api-key',
          authcScheme: 'Bearer',
          credential: 'some-invalid-token',
        },
      });

      expect(response).toHaveStatusCode(500);
      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('not compatible with UIAM');
    });

    apiTest('should reject invalidate request with non-UIAM credentials', async ({ apiClient }) => {
      // Attempt to invalidate an API key using non UIAM API Key.
      const response = await apiClient.post('test_endpoints/uiam/api_keys/_invalidate', {
        headers: { ...COMMON_UNSAFE_HEADERS },
        responseType: 'json',
        body: {
          id: 'some-api-key-id',
          authcScheme: 'ApiKey',
          credential: 'some-api-key-value:',
        },
      });

      expect(response).toHaveStatusCode(500);
      expect(response.body.message).toBeDefined();
      expect(response.body.message).toContain('not a UIAM API key');
    });
  }
);
