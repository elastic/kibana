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

apiTest.describe(
  '[NON-MKI] UIAM OAuth token exchange on MCP endpoint',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let oauthAccessToken: string;

    apiTest.beforeAll(async ({ kbnUrl, config: { organizationId, projectType } }) => {
      const audience = `${new URL(kbnUrl.get()).origin}/`;

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
      'should exchange OAuth token and authenticate successfully on MCP endpoint',
      async ({ apiClient }) => {
        // The MCP endpoint is tagged with `security:acceptUiamOAuth`, so the HTTP authentication
        // provider should detect the `essu_` Bearer token, exchange it via UIAM for an ephemeral
        // token, and authenticate the request.
        const response = await apiClient.post(MCP_ENDPOINT, {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${oauthAccessToken}`,
          },
          responseType: 'json',
          body: {
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'test-client', version: '1.0.0' },
            },
            id: 1,
          },
        });

        expect(response.statusCode).toBe(200);
      }
    );

    apiTest('should reject OAuth token on a non-MCP endpoint', async ({ apiClient }) => {
      // Sending an `essu_` OAuth token to a non-tagged endpoint should fall through
      // to ES authentication which will reject it (the token is not a valid ES credential).
      const response = await apiClient.get('internal/security/me', {
        headers: {
          ...COMMON_HEADERS,
          Authorization: `Bearer ${oauthAccessToken}`,
        },
        responseType: 'json',
      });

      expect(response.statusCode).toBe(401);
    });

    apiTest('should reject an invalid OAuth token on MCP endpoint', async ({ apiClient }) => {
      const mid = Math.floor(oauthAccessToken.length / 2);
      const invalidToken =
        oauthAccessToken.slice(0, mid) + 'CORRUPTED' + oauthAccessToken.slice(mid);

      const response = await apiClient.post(MCP_ENDPOINT, {
        headers: {
          ...COMMON_HEADERS,
          Authorization: `Bearer ${invalidToken}`,
        },
        responseType: 'json',
        body: {
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' },
          },
          id: 1,
        },
      });

      expect(response.statusCode).toBe(401);
    });

    apiTest(
      'should reject OAuth token with wrong audience on MCP endpoint',
      async ({ apiClient, config: { organizationId, projectType } }) => {
        const wrongAudienceToken = await createUiamOAuthAccessToken({
          username: '1234567890',
          organizationId: organizationId!,
          projectType: projectType!,
          roles: ['admin'],
          email: 'elastic_admin@elastic.co',
          audience: 'https://wrong-kibana.example.com',
        });

        const response = await apiClient.post(MCP_ENDPOINT, {
          headers: {
            ...COMMON_HEADERS,
            Authorization: `Bearer ${wrongAudienceToken}`,
          },
          responseType: 'json',
          body: {
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'test-client', version: '1.0.0' },
            },
            id: 1,
          },
        });

        expect(response.statusCode).toBe(400);
      }
    );

    apiTest(
      'should reject a non-essu_ Bearer token on MCP endpoint (falls through to ES)',
      async ({ apiClient }) => {
        // A regular Bearer token (not prefixed with `essu_`) on a tagged route should
        // skip the UIAM OAuth branch and fall through to standard ES authentication.
        const response = await apiClient.post(MCP_ENDPOINT, {
          headers: {
            ...COMMON_HEADERS,
            Authorization: 'Bearer some-regular-jwt-token',
          },
          responseType: 'json',
          body: {
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'test-client', version: '1.0.0' },
            },
            id: 1,
          },
        });

        expect(response.statusCode).toBe(401);
      }
    );
  }
);
