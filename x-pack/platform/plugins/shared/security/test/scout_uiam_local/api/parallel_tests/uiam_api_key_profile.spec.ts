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
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { timeoutSignal } from '@kbn/std';
import { lazySchema, z } from '@kbn/zod';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { COMMON_HEADERS, COMMON_UNSAFE_HEADERS, extractAttributeValue } from '../fixtures';

const grantedKeySchema = lazySchema(() => z.object({ id: z.string(), key: z.string() }));

// These compare against what Elasticsearch really created for the user when they logged in, not
// against a value computed here, so they notice if Elasticsearch builds profile IDs differently.
apiTest.describe(
  '[NON-MKI] Profile of an internal UIAM API key',
  {
    tag: [
      '@local-serverless-search',
      '@local-serverless-observability_complete',
      '@local-serverless-observability_logs_essentials',
      '@local-serverless-security_complete',
      '@local-serverless-security_essentials',
      '@local-serverless-security_ease',
      '@local-serverless-vectordb',
    ],
  },
  () => {
    let userSessionFactory: () => Promise<{ cookie: string; accessToken: string }>;

    apiTest.beforeAll(async ({ apiClient, config: { organizationId, projectType } }) => {
      if (!organizationId || !projectType) {
        throw new Error('The UIAM organization and project type are not configured.');
      }

      userSessionFactory = async () => {
        const samlResponse = await createSAMLResponse({
          username: '1234567890',
          email: 'elastic_admin@elastic.co',
          roles: ['admin'],
          serverless: {
            uiamEnabled: true,
            organizationId,
            projectType,
          },
        });

        const decodedSamlResponse = Buffer.from(samlResponse, 'base64').toString('utf-8');
        const callbackResponse = await apiClient.post('api/security/saml/callback', {
          body: `SAMLResponse=${encodeURIComponent(samlResponse)}`,
        });
        const sessionCookie = parseCookie(callbackResponse.headers['set-cookie'][0]);
        if (!sessionCookie) {
          throw new Error('The login did not set a session cookie.');
        }

        return {
          cookie: sessionCookie.cookieString(),
          accessToken: extractAttributeValue(
            decodedSamlResponse,
            MOCK_IDP_ATTRIBUTE_UIAM_ACCESS_TOKEN
          ),
        };
      };
    });

    apiTest(
      'resolves to the profile of the user who created the key, in-process and over HTTP',
      async ({ apiClient }) => {
        // 1. The profile Elasticsearch created for the user when they logged in.
        const { cookie, accessToken } = await userSessionFactory();
        const meResponse = await apiClient.get('internal/security/me', {
          headers: { ...COMMON_HEADERS, Cookie: cookie },
          responseType: 'json',
        });
        expect(meResponse).toHaveStatusCode(200);
        const sessionProfileUid = meResponse.body.profile_uid;
        expect(typeof sessionProfileUid).toBe('string');
        expect(sessionProfileUid.startsWith('u_')).toBe(true);

        // 2. A key granted from that session carries the user as its creator.
        const internalUiamApiKey = await grantUiamApiKey(accessToken);

        try {
          // 3. Resolve the key's profile as a background task would, and through a real request.
          const response = await apiClient.post('test_endpoints/self_client/fake_request_profile', {
            headers: { ...COMMON_UNSAFE_HEADERS },
            responseType: 'json',
            body: { apiKey: internalUiamApiKey.key },
          });

          expect(response).toHaveStatusCode(200);
          const sameProfile = { profileId: sessionProfileUid, profileUid: sessionProfileUid };
          expect(response.body).toStrictEqual({ inProcess: sameProfile, selfCall: sameProfile });
        } finally {
          const invalidateResponse = await apiClient.post(
            'test_endpoints/uiam/api_keys/_invalidate',
            {
              headers: { ...COMMON_UNSAFE_HEADERS },
              responseType: 'json',
              body: {
                id: internalUiamApiKey.id,
                authcScheme: 'ApiKey',
                credential: internalUiamApiKey.key,
              },
            }
          );
          expect(invalidateResponse).toHaveStatusCode(200);
        }
      }
    );
  }
);

const grantUiamApiKey = async (accessToken: string) => {
  const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  try {
    const deadline = timeoutSignal(30_000);
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
        signal: deadline,
      });

      const body: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          `Failed to grant a UIAM API key: ${response.status} ${JSON.stringify(body)}`
        );
      }
      return grantedKeySchema.parse(body);
    } finally {
      deadline.dispose();
    }
  } finally {
    await dispatcher.close();
  }
};
