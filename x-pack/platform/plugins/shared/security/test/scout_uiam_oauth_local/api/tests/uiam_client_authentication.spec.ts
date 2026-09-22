/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_GATEWAY_SHARED_SECRET } from '@kbn/mock-idp-utils';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { apiTest, COMMON_HEADERS, COMMON_UNSAFE_HEADERS, TEST_USERNAME } from '../fixtures';

apiTest.describe(
  '[NON-MKI] Inbound UIAM ephemeral token client authentication',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest(
      'preserves the gateway secret for primary Elasticsearch authentication',
      async ({ apiClient, ephemeralToken }) => {
        const response = await apiClient.get('internal/security/me', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${ephemeralToken}`,
            [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_GATEWAY_SHARED_SECRET,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body).toMatchObject({
          username: TEST_USERNAME,
          roles: ['admin'],
        });
      }
    );

    apiTest(
      'preserves the gateway secret for secondary Elasticsearch authentication',
      async ({ apiClient, ephemeralToken }) => {
        const response = await apiClient.post('test_endpoints/uiam/secondary_auth', {
          headers: {
            ...COMMON_UNSAFE_HEADERS,
            Authorization: `Bearer ${ephemeralToken}`,
            [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_GATEWAY_SHARED_SECRET,
          },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body._total.num_docs).toBeGreaterThan(0);
      }
    );

    apiTest(
      'preserves the gateway secret for direct UIAM calls',
      async ({ apiClient, ephemeralToken }) => {
        const response = await apiClient.get('internal/security/oauth/clients', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${ephemeralToken}`,
            [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_GATEWAY_SHARED_SECRET,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(Array.isArray(response.body.clients)).toBe(true);
      }
    );

    apiTest(
      'preserves the gateway secret when granting an Elasticsearch API key',
      async ({ apiClient, esClient, ephemeralToken }) => {
        const grantResponse = await apiClient.post('test_endpoints/api_keys/_grant', {
          headers: {
            ...COMMON_UNSAFE_HEADERS,
            Authorization: `Bearer ${ephemeralToken}`,
            [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_GATEWAY_SHARED_SECRET,
          },
          responseType: 'json',
          body: {},
        });

        expect(grantResponse).toHaveStatusCode(200);
        const { id, encoded }: { id: string; encoded: string } = grantResponse.body;
        try {
          const response = await apiClient.get('internal/security/me', {
            headers: { ...COMMON_HEADERS, Authorization: `ApiKey ${encoded}` },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          expect(response.body.username).toBe(TEST_USERNAME);
        } finally {
          await esClient.security.invalidateApiKey({ ids: [id] });
        }
      }
    );

    for (const { description, clientHeaders } of [
      { description: 'missing', clientHeaders: {} },
      {
        description: 'invalid',
        clientHeaders: { [ES_CLIENT_AUTHENTICATION_HEADER]: 'invalid-gateway-secret' },
      },
    ]) {
      apiTest(
        `does not replace ${description} client authentication with the Kibana secret`,
        async ({ apiClient, ephemeralToken }) => {
          const response = await apiClient.get('internal/security/me', {
            headers: {
              ...COMMON_HEADERS,
              Authorization: `Bearer ${ephemeralToken}`,
              ...clientHeaders,
            },
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(401);
        }
      );
    }
  }
);
