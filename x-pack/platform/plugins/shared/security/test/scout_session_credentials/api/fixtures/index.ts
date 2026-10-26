/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';

import {
  createSAMLResponse,
  createUiamSessionTokens,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import { apiTest as base } from '@kbn/scout';

interface SessionCredentials {
  makeSession: (lifetime?: number) => Promise<Record<string, string>>;
  issueExternalBearer: () => Promise<string>;
  waitMs: number;
  secondWaitMs: number;
  clientAuthHeaders: Record<string, string>;
}

export const apiTest = base.extend<{ sessionCredentials: SessionCredentials }>({
  sessionCredentials: async ({ apiClient, samlAuth, esClient, config }, use) => {
    const makeSession = async (lifetime = 10) => {
      if (!config.uiam) {
        return {
          ...(await samlAuth.asInteractiveUser('admin')).cookieHeader,
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'kibana',
        };
      }

      if (!config.organizationId || !config.projectType) {
        throw new Error('UIAM test configuration is missing its organization or project type');
      }

      const saml = await createSAMLResponse({
        username: '1234567890',
        email: 'elastic_admin@elastic.co',
        roles: ['admin'],
        serverless: {
          uiamEnabled: true,
          organizationId: config.organizationId,
          projectType: config.projectType,
          accessTokenLifetimeSec: lifetime,
        },
      });
      const response = await apiClient.post('api/security/saml/callback', {
        body: `SAMLResponse=${encodeURIComponent(saml)}`,
      });
      const cookies = response.headers['set-cookie'];
      const cookie = parseCookie(Array.isArray(cookies) ? cookies[0] : cookies);
      if (!cookie) {
        throw new Error('SAML authentication did not return a session cookie');
      }

      return {
        Cookie: cookie.cookieString(),
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'kibana',
      } as Record<string, string>;
    };

    const issueExternalBearer = async () => {
      if (!config.uiam) {
        return (
          await esClient.security.getToken({
            grant_type: 'password',
            username: config.auth.username,
            password: config.auth.password,
          })
        ).access_token;
      }

      if (!config.organizationId || !config.projectType) {
        throw new Error('UIAM test configuration is incomplete');
      }

      return (
        await createUiamSessionTokens({
          username: '9876543210',
          email: 'elastic_external@elastic.co',
          roles: ['admin'],
          organizationId: config.organizationId,
          projectType: config.projectType,
          accessTokenLifetimeSec: 10,
        })
      ).accessToken;
    };

    await use({
      makeSession,
      issueExternalBearer,
      waitMs: config.uiam ? 15_000 : 20_000,
      secondWaitMs: config.uiam ? 65_000 : 20_000,
      clientAuthHeaders: config.uiam
        ? { 'x-client-authentication': MOCK_IDP_UIAM_SHARED_SECRET }
        : {},
    });
  },
});
