/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUiamOAuthAccessToken } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../fixtures';

const MCP_ENDPOINT = 'api/agent_builder/mcp';
// A non-MCP, `access: 'public'` route that requires authentication. It is not tagged with
// `security:acceptUiamOAuth`, so it only accepts UIAM OAuth tokens because the config set runs with
// `xpack.security.authc.http.uiam.taggedRoutesOnly=false`.
const PUBLIC_ROUTE = 'api/alerting/_health';
// A non-MCP, `access: 'internal'` route. It must always reject UIAM OAuth tokens, even when
// `taggedRoutesOnly` is disabled, because the public-route gate only applies to public routes.
const INTERNAL_ROUTE = 'internal/security/me';

apiTest.describe(
  '[NON-MKI] UIAM OAuth on non-MCP routes (taggedRoutesOnly disabled)',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let oauthAccessToken: string;

    apiTest.beforeAll(async ({ kbnUrl, config: { organizationId, projectType } }) => {
      // The OAuth token audience must match the configured Kibana resource server identifier
      // (`xpack.security.mcp.oauth2.metadata.resource`), which UIAM validates during exchange. It is
      // the resource server (Kibana) audience, not a per-route value, so the same token is valid for
      // any route.
      const audience = `${new URL(kbnUrl.get()).origin}/${MCP_ENDPOINT}`;

      oauthAccessToken = await createUiamOAuthAccessToken({
        username: '1234567890',
        organizationId: organizationId!,
        projectType: projectType!,
        roles: ['admin'],
        email: 'elastic_admin@elastic.co',
        audience,
      });
    });

    apiTest(
      'should exchange and authenticate a UIAM OAuth token on a non-MCP public route',
      async ({ apiClient }) => {
        const response = await apiClient.get(PUBLIC_ROUTE, {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${oauthAccessToken}`,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(200);
      }
    );

    apiTest(
      'should still reject a UIAM OAuth token on a non-MCP internal route',
      async ({ apiClient }) => {
        // Internal routes are excluded from the public-route gate, so the `essu_` token is not
        // exchanged and falls through to ES authentication, which rejects it.
        const response = await apiClient.get(INTERNAL_ROUTE, {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${oauthAccessToken}`,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(401);
      }
    );

    apiTest(
      'should return 401 with WWW-Authenticate resource_metadata on an unauthenticated public route',
      async ({ apiClient }) => {
        // RFC 9728 discovery is broadened to public routes when `taggedRoutesOnly` is disabled, so an
        // unauthenticated public request advertises the protected resource metadata location.
        const response = await apiClient.get(PUBLIC_ROUTE, {
          headers: COMMON_HEADERS,
          responseType: 'json',
        });

        expect(response.statusCode).toBe(401);

        const wwwAuthenticate = response.headers['www-authenticate'];
        expect(wwwAuthenticate).toBeDefined();
        expect(wwwAuthenticate).toContain('resource_metadata="');
        expect(wwwAuthenticate).toContain('/.well-known/oauth-protected-resource');
      }
    );

    apiTest(
      'should reject an invalid UIAM OAuth token on a non-MCP public route',
      async ({ apiClient }) => {
        const mid = Math.floor(oauthAccessToken.length / 2);
        const invalidToken =
          oauthAccessToken.slice(0, mid) + 'CORRUPTED' + oauthAccessToken.slice(mid);

        const response = await apiClient.get(PUBLIC_ROUTE, {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${invalidToken}`,
          },
          responseType: 'json',
        });

        expect(response.statusCode).toBe(401);
      }
    );
  }
);
