/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  deriveInternalCallerAttestation,
  HTTPAuthorizationHeader,
  UIAM_INTERNAL_CALLER_ATTESTATION_HEADER,
} from '@kbn/core-security-server';
import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY, MOCK_IDP_UIAM_SHARED_SECRET } from '@kbn/mock-idp-utils';
import type { ApiClientFixture, SamlAuth } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS, COMMON_UNSAFE_HEADERS } from '../fixtures';

const NO_ACCESS = { canViewBillingDetails: false, canInviteOrganizationMembers: false };

const FULL_ACCESS = { canViewBillingDetails: true, canInviteOrganizationMembers: true };

// These tests cannot be run on MKI because the mock IdP is what grants UIAM roles.
apiTest.describe('[NON-MKI] UIAM access checks through Core', { tag: tags.serverless.all }, () => {
  const accessWith = (apiClient: ApiClientFixture, credentials: Record<string, string>) =>
    apiClient.get('test_endpoints/uiam/access', {
      headers: { ...COMMON_HEADERS, ...credentials },
      responseType: 'json',
    });

  const accessAs = async (
    apiClient: ApiClientFixture,
    samlAuth: SamlAuth,
    role: string,
    uiamRoles: { uiamOrganizationRoles?: string[]; uiamProjectRoles?: string[] } = {}
  ) => {
    const credentials = await samlAuth.session.getApiCredentialsForRole(role, uiamRoles);
    return accessWith(apiClient, credentials);
  };

  apiTest('denies everything to a member without UIAM roles', async ({ apiClient, samlAuth }) => {
    const response = await accessAs(apiClient, samlAuth, 'viewer');

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(NO_ACCESS);
  });

  apiTest(
    'denies everything to a Kibana admin without UIAM roles',
    async ({ apiClient, samlAuth }) => {
      const response = await accessAs(apiClient, samlAuth, 'admin');

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(NO_ACCESS);
    }
  );

  apiTest(
    'grants only billing access to a billing admin regardless of project role',
    async ({ apiClient, samlAuth }) => {
      const response = await accessAs(apiClient, samlAuth, 'viewer', {
        uiamOrganizationRoles: ['billing-admin'],
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({ ...NO_ACCESS, canViewBillingDetails: true });
    }
  );

  apiTest('denies everything to a project viewer', async ({ apiClient, samlAuth }) => {
    const response = await accessAs(apiClient, samlAuth, 'viewer', {
      uiamProjectRoles: ['viewer'],
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(NO_ACCESS);
  });

  apiTest('grants everything to an organization admin', async ({ apiClient, samlAuth }) => {
    const response = await accessAs(apiClient, samlAuth, 'admin', {
      uiamOrganizationRoles: ['organization-admin'],
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(FULL_ACCESS);
  });

  apiTest('grants everything to an organization admin UIAM API key', async ({ apiClient }) => {
    const response = await accessWith(apiClient, {
      Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
    });

    expect(response).toHaveStatusCode(200);
    expect(response.body).toStrictEqual(FULL_ACCESS);
  });

  apiTest(
    'denies everything to a UIAM API key granted by a plain member',
    async ({ apiClient, samlAuth }) => {
      // Granting with the member's own session gives the key that member's roles.
      const grantResponse = await apiClient.post('test_endpoints/uiam/api_keys/_grant', {
        headers: {
          ...COMMON_UNSAFE_HEADERS,
          ...(await samlAuth.session.getApiCredentialsForRole('viewer')),
        },
        responseType: 'json',
        body: { name: 'access-plain-member' },
      });
      expect(grantResponse).toHaveStatusCode(200);

      // A key granted through Kibana is internal: on a real request it only authenticates
      // alongside Kibana's caller attestation, the way Kibana's own loopback callers send it.
      const credential = new HTTPAuthorizationHeader('ApiKey', grantResponse.body.api_key);
      const response = await accessWith(apiClient, {
        Authorization: credential.toString(),
        [UIAM_INTERNAL_CALLER_ATTESTATION_HEADER]: deriveInternalCallerAttestation(
          MOCK_IDP_UIAM_SHARED_SECRET,
          credential
        ),
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual(NO_ACCESS);
    }
  );

  apiTest(
    'rejects a credential that did not come from UIAM',
    async ({ apiClient, config: { auth } }) => {
      const basic = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      const response = await accessWith(apiClient, { Authorization: `Basic ${basic}` });

      expect(response).toHaveStatusCode(400);
      expect(response.body).toMatchObject({
        message: 'Provided credential is not compatible with UIAM',
      });
    }
  );
});
