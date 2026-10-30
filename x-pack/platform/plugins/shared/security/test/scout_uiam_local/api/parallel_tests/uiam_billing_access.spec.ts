/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import type { ApiClientFixture, SamlAuth } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS, COMMON_UNSAFE_HEADERS } from '../fixtures';

// These tests cannot be run on MKI because the mock IdP is what grants UIAM organization roles.
apiTest.describe('[NON-MKI] UIAM billing access through Core', { tag: tags.serverless.all }, () => {
  const billingAccessWith = (apiClient: ApiClientFixture, credentials: Record<string, string>) =>
    apiClient.get('test_endpoints/uiam/billing_access', {
      headers: { ...COMMON_HEADERS, ...credentials },
      responseType: 'json',
    });

  const billingAccessAs = async (
    apiClient: ApiClientFixture,
    samlAuth: SamlAuth,
    role: string,
    uiamOrganizationRoles: string[]
  ) => {
    const credentials = await samlAuth.session.getApiCredentialsForRole(role, {
      uiamOrganizationRoles,
    });
    return billingAccessWith(apiClient, credentials);
  };

  apiTest(
    'denies billing access to a member without organization roles',
    async ({ apiClient, samlAuth }) => {
      const response = await billingAccessAs(apiClient, samlAuth, 'viewer', []);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ hasBillingAccess: false });
    }
  );

  apiTest(
    'denies billing access to a project admin without organization roles',
    async ({ apiClient, samlAuth }) => {
      const response = await billingAccessAs(apiClient, samlAuth, 'admin', []);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ hasBillingAccess: false });
    }
  );

  apiTest(
    'grants billing access to a billing admin regardless of project role',
    async ({ apiClient, samlAuth }) => {
      const response = await billingAccessAs(apiClient, samlAuth, 'viewer', ['billing-admin']);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ hasBillingAccess: true });
    }
  );

  apiTest('grants billing access to an organization admin', async ({ apiClient, samlAuth }) => {
    const response = await billingAccessAs(apiClient, samlAuth, 'admin', ['organization-admin']);

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ hasBillingAccess: true });
  });

  apiTest('grants billing access to an organization admin UIAM API key', async ({ apiClient }) => {
    const response = await billingAccessWith(apiClient, {
      Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ hasBillingAccess: true });
  });

  apiTest(
    'denies billing access to a UIAM API key granted by a plain member',
    async ({ apiClient, samlAuth }) => {
      // Granting with the member's own session gives the key that member's roles.
      const grantResponse = await apiClient.post('test_endpoints/uiam/api_keys/_grant', {
        headers: {
          ...COMMON_UNSAFE_HEADERS,
          ...(await samlAuth.session.getApiCredentialsForRole('viewer')),
        },
        responseType: 'json',
        body: { name: 'billing-access-plain-member' },
      });
      expect(grantResponse).toHaveStatusCode(200);

      const response = await billingAccessWith(apiClient, {
        Authorization: `ApiKey ${grantResponse.body.api_key}`,
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ hasBillingAccess: false });
    }
  );

  apiTest(
    'rejects a credential that did not come from UIAM',
    async ({ apiClient, config: { auth } }) => {
      const basic = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      const response = await billingAccessWith(apiClient, { Authorization: `Basic ${basic}` });

      expect(response).toHaveStatusCode(400);
      expect(response.body).toMatchObject({
        message: 'Provided credential is not compatible with UIAM',
      });
    }
  );
});
