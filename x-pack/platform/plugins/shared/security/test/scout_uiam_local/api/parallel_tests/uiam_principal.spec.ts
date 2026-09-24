/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';

import { createSAMLResponse, MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../fixtures';

const PRINCIPAL_PATH = 'test_endpoints/principal';

// These tests cannot be run on MKI because they rely on the Mock IdP plugin and its fixed credentials.
apiTest.describe(
  '[NON-MKI] Core security.authc.getPrincipal with UIAM credentials',
  { tag: tags.serverless.all },
  () => {
    apiTest(
      'classifies a session-authenticated request as a user',
      async ({ apiClient, config: { organizationId, projectType } }) => {
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
        const cookie = parseCookie(
          (
            await apiClient.post('api/security/saml/callback', {
              body: `SAMLResponse=${encodeURIComponent(samlResponse)}`,
            })
          ).headers['set-cookie'][0]
        )!.cookieString();

        const response = await apiClient.get(PRINCIPAL_PATH, {
          headers: { ...COMMON_HEADERS, Cookie: cookie },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.principal).toMatchObject({ type: 'user', username: '1234567890' });
      }
    );

    apiTest('classifies an external UIAM API key as a UIAM API key', async ({ apiClient }) => {
      const response = await apiClient.get(PRINCIPAL_PATH, {
        headers: { ...COMMON_HEADERS, Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}` },
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      expect(response.body.principal).toMatchObject({ type: 'api_key', variant: 'uiam' });
      expect(typeof response.body.principal.apiKeyId).toBe('string');
    });
  }
);
