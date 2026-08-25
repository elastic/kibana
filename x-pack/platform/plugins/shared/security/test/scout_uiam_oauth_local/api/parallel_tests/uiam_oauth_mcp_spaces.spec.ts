/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractWWWAuthenticateParams } from '@modelcontextprotocol/sdk/client/auth.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { parse as parseCookie } from 'tough-cookie';
import { Agent } from 'undici';

import { createSAMLResponse, createUiamOAuthAccessToken } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS, COMMON_UNSAFE_HEADERS } from '../fixtures';

const MCP_ENDPOINT = 'api/agent_builder/mcp';
const SPACE_ID = 'oauth-poc-space';

const tlsAgent = new Agent({ connect: { rejectUnauthorized: false } });
const insecureFetch: typeof fetch = (url, init) => {
  return fetch(url, { ...init, dispatcher: tlsAgent } as RequestInit);
};

apiTest.describe(
  '[NON-MKI] MCP OAuth flow in a non-default space',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let oauthAccessToken: string;
    let kibanaBaseUrl: string;
    // Initialized to empty so afterAll is a no-op when beforeAll fails before auth completes.
    let adminHeaders: Record<string, string> = {};

    apiTest.beforeAll(async ({ apiClient, kbnUrl, config: { organizationId, projectType } }) => {
      kibanaBaseUrl = new URL(kbnUrl.get()).origin;

      // Authenticate as admin via SAML to obtain a session cookie for privileged operations
      // (space creation requires an authenticated admin session).
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
      const samlCallback = await apiClient.post('api/security/saml/callback', {
        body: `SAMLResponse=${encodeURIComponent(samlResponse)}`,
      });
      const setCookieHeader = samlCallback.headers['set-cookie']?.[0];
      if (!setCookieHeader) {
        throw new Error(
          'SAML callback did not return a session cookie — check SAML provider config'
        );
      }
      const cookie = parseCookie(setCookieHeader)!.cookieString();
      adminHeaders = { ...COMMON_UNSAFE_HEADERS, Cookie: cookie };

      const spaceResponse = await apiClient.post('api/spaces/space', {
        headers: adminHeaders,
        responseType: 'json',
        body: { id: SPACE_ID, name: 'OAuth POC Space' },
      });
      expect([200, 409]).toContain(spaceResponse.statusCode); // 409 = already exists from a prior run

      oauthAccessToken = await createUiamOAuthAccessToken({
        username: '1234567890',
        organizationId: organizationId!,
        projectType: projectType!,
        roles: ['admin'],
        email: 'elastic_admin@elastic.co',
        // Audience is the WHATWG-canonical base URL (with trailing slash) — the value UIAM echoes
        // as `aud` after the MCP SDK round-trips the PRM resource through new URL().
        audience: `${kibanaBaseUrl}/`,
      });
    });

    apiTest.afterAll(async ({ apiClient }) => {
      // Guard: skip if beforeAll failed before populating adminHeaders.
      if (!adminHeaders.Cookie) {
        return;
      }
      await apiClient.delete(`api/spaces/space/${SPACE_ID}`, { headers: adminHeaders });
    });

    apiTest(
      'returns 401 with root resource_metadata for unauthenticated space-prefixed MCP request',
      async ({ apiClient }) => {
        const response = await insecureFetch(
          new URL(`${kibanaBaseUrl}/s/${SPACE_ID}/${MCP_ENDPOINT}`),
          {
            method: 'POST',
            headers: COMMON_HEADERS,
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'initialize',
              params: {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'test-client', version: '1.0.0' },
              },
              id: 1,
            }),
          }
        );

        expect(response.status).toBe(401);
        const { resourceMetadataUrl } = extractWWWAuthenticateParams(response);
        expect(resourceMetadataUrl!.pathname).toBe('/.well-known/oauth-protected-resource');

        // Also verify via apiClient that unauthenticated POST to the space-prefixed endpoint returns 401
        const apiResponse = await apiClient.post(`s/${SPACE_ID}/${MCP_ENDPOINT}`, {
          headers: COMMON_HEADERS,
          responseType: 'json',
          body: {
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'test-client', version: '1.0.0' },
            },
            id: 2,
          },
        });
        expect(apiResponse.statusCode).toBe(401);
      }
    );

    apiTest(
      'completes MCP handshake against a space-prefixed endpoint with a base-URL-audience token',
      async ({ apiClient }) => {
        // Verify the token works via apiClient on the space-prefixed endpoint first
        const verifyResponse = await apiClient.post(`s/${SPACE_ID}/${MCP_ENDPOINT}`, {
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
        expect(verifyResponse.statusCode).toBe(200);

        // Now use the real MCP SDK client with StreamableHTTPClientTransport
        const transport = new StreamableHTTPClientTransport(
          new URL(`${kibanaBaseUrl}/s/${SPACE_ID}/${MCP_ENDPOINT}`),
          {
            requestInit: {
              headers: {
                Authorization: `Bearer ${oauthAccessToken}`,
                'x-elastic-internal-origin': 'kibana',
              },
            },
            fetch: insecureFetch,
          }
        );
        const client = new Client({ name: 'scout-mcp-space-test', version: '1.0.0' });

        try {
          await client.connect(transport);
          const { tools } = await client.listTools();
          expect(tools.length).toBeGreaterThan(0);
        } finally {
          await client.close();
        }
      }
    );
  }
);
