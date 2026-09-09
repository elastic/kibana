/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import {
  apiTest,
  COMMON_HEADERS,
  TEST_USERNAME,
} from '../../../scout_uiam_client_auth_local/api/fixtures';

// This config uses the shared secret accepted by the local UIAM service.
apiTest.describe(
  '[NON-MKI] UIAM ephemeral token client authentication fallback',
  { tag: tags.serverless.security.complete },
  () => {
    apiTest(
      'defaults to the Kibana secret for primary Elasticsearch authentication',
      async ({ apiClient, ephemeralToken }) => {
        const response = await apiClient.get('internal/security/me', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${ephemeralToken}`,
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
      'defaults to the Kibana secret for secondary Elasticsearch authentication',
      async ({ apiClient, ephemeralToken }) => {
        const response = await apiClient.post('test_endpoints/uiam/secondary_auth', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${ephemeralToken}`,
          },
          responseType: 'json',
          body: {},
        });

        expect(response).toHaveStatusCode(200);
        expect(response.body._total.num_docs).toBeGreaterThan(0);
      }
    );

    apiTest(
      'defaults to the Kibana secret for direct UIAM calls',
      async ({ apiClient, ephemeralToken }) => {
        const response = await apiClient.get('internal/security/oauth/clients', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${ephemeralToken}`,
          },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect(Array.isArray(response.body.clients)).toBe(true);
      }
    );

    apiTest(
      'defaults to the Kibana secret when granting an Elasticsearch API key',
      async ({ apiClient, esClient, ephemeralToken }) => {
        const grantResponse = await apiClient.post('test_endpoints/api_keys/_grant', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${ephemeralToken}`,
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

    apiTest(
      'rejects a supplied invalid secret instead of replacing it',
      async ({ apiClient, ephemeralToken }) => {
        const response = await apiClient.get('internal/security/me', {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${ephemeralToken}`,
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'invalid-gateway-secret',
          },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(401);
      }
    );
  }
);
