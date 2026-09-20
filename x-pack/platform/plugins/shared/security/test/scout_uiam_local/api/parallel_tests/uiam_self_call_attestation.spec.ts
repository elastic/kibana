/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';
import { Agent, fetch } from 'undici';

import {
  createSAMLResponse,
  MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN,
  MOCK_IDP_UIAM_SERVICE_URL,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { COMMON_UNSAFE_HEADERS, extractAttributeValue } from '../fixtures';

const OAUTH_SELF_CALL_TARGET = '/internal/test_endpoints/self_client/oauth_me';

apiTest.describe(
  '[NON-MKI] Genuine Kibana self-call UIAM attestation',
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
      'Kibana-minted internal UIAM API key self-call stamps and the receiver attaches the ES secret',
      async ({ apiClient }) => {
        const [_, { accessToken }] = await userSessionCookieFactory();
        const grantResponse = await grantUiamApiKey(accessToken);
        expect(grantResponse.status).toBe(200);
        const internalUiamApiKey = grantResponse.body;

        try {
          const response = await apiClient.post('test_endpoints/self_client/fake_request', {
            headers: { ...COMMON_UNSAFE_HEADERS },
            responseType: 'json',
            body: { apiKey: internalUiamApiKey.key },
          });

          expect(response).toHaveStatusCode(200);
          expect(response.body).toStrictEqual(
            expect.objectContaining({ username: internalUiamApiKey.id })
          );
        } finally {
          await apiClient.post('test_endpoints/uiam/api_keys/_invalidate', {
            headers: { ...COMMON_UNSAFE_HEADERS },
            responseType: 'json',
            body: {
              id: internalUiamApiKey.id,
              authcScheme: 'ApiKey',
              credential: internalUiamApiKey.key,
            },
          });
        }
      }
    );

    apiTest(
      'Cookie session on the UI Run path (not Task Manager worker) stamps and the acceptUiamOAuth receiver skips exchange',
      async ({ apiClient }) => {
        const [userSessionCookie] = await userSessionCookieFactory();

        const response = await apiClient.post('test_endpoints/self_client/as_scoped', {
          headers: { ...COMMON_UNSAFE_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
          body: { path: OAUTH_SELF_CALL_TARGET },
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));
      }
    );
  }
);

const grantUiamApiKey = async (accessToken: string) => {
  const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  try {
    const response = await fetch(`${MOCK_IDP_UIAM_SERVICE_URL}/uiam/api/v1/api-keys/_grant`, {
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
      dispatcher,
    });
    const body = (await response.json()) as { id: string; key: string };
    return { status: response.status, body };
  } finally {
    await dispatcher.close();
  }
};
