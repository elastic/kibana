/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, SamlAuth } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../fixtures';

// These tests cannot be run on MKI because the mock IdP is what grants UIAM organization roles.
apiTest.describe('[NON-MKI] Billing access decided by UIAM', { tag: tags.serverless.all }, () => {
  const billingAccessAs = async (
    apiClient: ApiClientFixture,
    samlAuth: SamlAuth,
    role: string,
    uiamOrganizationRoles: string[]
  ) => {
    const credentials = await samlAuth.session.getApiCredentialsForRole(role, {
      uiamOrganizationRoles,
    });
    return apiClient.get('internal/cloud/billing_access', {
      headers: { ...COMMON_HEADERS, 'elastic-api-version': '1', ...credentials },
      responseType: 'json',
    });
  };

  apiTest('is denied to a member without organization roles', async ({ apiClient, samlAuth }) => {
    const response = await billingAccessAs(apiClient, samlAuth, 'viewer', []);

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ hasAccess: false });
  });

  apiTest(
    'is denied to a project admin without organization roles',
    async ({ apiClient, samlAuth }) => {
      const response = await billingAccessAs(apiClient, samlAuth, 'admin', []);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ hasAccess: false });
    }
  );

  apiTest(
    'is granted to a billing admin regardless of project role',
    async ({ apiClient, samlAuth }) => {
      const response = await billingAccessAs(apiClient, samlAuth, 'viewer', ['billing-admin']);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ hasAccess: true });
    }
  );

  apiTest('is granted to an organization admin', async ({ apiClient, samlAuth }) => {
    const response = await billingAccessAs(apiClient, samlAuth, 'admin', ['organization-admin']);

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual({ hasAccess: true });
  });
});
