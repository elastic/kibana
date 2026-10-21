/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, SamlAuth } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_UNSAFE_HEADERS } from '../fixtures';

const BILLING_DETAILS_CHECK = (organizationId: string) => ({
  action: 'get',
  resource: { type: 'billing-details', organization_id: organizationId },
});

// These tests cannot be run on MKI because the mock IdP is what grants UIAM organization roles.
apiTest.describe(
  '[NON-MKI] UIAM authorization checks through Core',
  { tag: tags.serverless.all },
  () => {
    let organizationId: string;

    apiTest.beforeAll(({ config }) => {
      organizationId = config.organizationId!;
    });

    const checkAs = async (
      apiClient: ApiClientFixture,
      samlAuth: SamlAuth,
      role: string,
      uiamOrganizationRoles: string[],
      checks: unknown[]
    ) => {
      const credentials = await samlAuth.session.getApiCredentialsForRole(role, {
        uiamOrganizationRoles,
      });
      return apiClient.post('test_endpoints/uiam/authorization/_check', {
        headers: { ...COMMON_UNSAFE_HEADERS, ...credentials },
        responseType: 'json',
        body: { checks },
      });
    };

    apiTest(
      'denies billing details to a member without organization roles',
      async ({ apiClient, samlAuth }) => {
        const check = BILLING_DETAILS_CHECK(organizationId);
        const response = await checkAs(apiClient, samlAuth, 'viewer', [], [check]);

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          permitted: false,
          checks: [{ ...check, permitted: false }],
        });
      }
    );

    apiTest(
      'denies billing details to a project admin without organization roles',
      async ({ apiClient, samlAuth }) => {
        const check = BILLING_DETAILS_CHECK(organizationId);
        const response = await checkAs(apiClient, samlAuth, 'admin', [], [check]);

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          permitted: false,
          checks: [{ ...check, permitted: false }],
        });
      }
    );

    apiTest(
      'permits billing details to a billing admin regardless of project role',
      async ({ apiClient, samlAuth }) => {
        const check = BILLING_DETAILS_CHECK(organizationId);
        const response = await checkAs(apiClient, samlAuth, 'viewer', ['billing-admin'], [check]);

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          permitted: true,
          checks: [{ ...check, permitted: true }],
        });
      }
    );

    apiTest('permits billing details to an organization admin', async ({ apiClient, samlAuth }) => {
      const check = BILLING_DETAILS_CHECK(organizationId);
      const response = await checkAs(apiClient, samlAuth, 'admin', ['organization-admin'], [check]);

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        permitted: true,
        checks: [{ ...check, permitted: true }],
      });
    });

    apiTest(
      'evaluates every check and permits only when all of them are permitted',
      async ({ apiClient, samlAuth }) => {
        const permittedCheck = BILLING_DETAILS_CHECK(organizationId);
        // UIAM scopes `billing-details` by organization, so the check is denied without it.
        const deniedCheck = { action: 'get', resource: { type: 'billing-details' } };
        const response = await checkAs(
          apiClient,
          samlAuth,
          'viewer',
          ['billing-admin'],
          [permittedCheck, deniedCheck]
        );

        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual({
          permitted: false,
          checks: [
            { ...permittedCheck, permitted: true },
            { ...deniedCheck, permitted: false },
          ],
        });
      }
    );

    apiTest(
      'surfaces UIAM errors instead of treating them as a deny',
      async ({ apiClient, samlAuth }) => {
        const response = await checkAs(
          apiClient,
          samlAuth,
          'viewer',
          ['billing-admin'],
          [
            {
              action: 'get',
              resource: { type: 'no-such-resource', organization_id: organizationId },
            },
          ]
        );

        expect(response).toHaveStatusCode(400);
      }
    );
  }
);
