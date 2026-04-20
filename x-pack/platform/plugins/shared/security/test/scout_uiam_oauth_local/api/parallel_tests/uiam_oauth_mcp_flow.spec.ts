/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  discoverAuthorizationServerMetadata,
  discoverOAuthProtectedResourceMetadata,
  extractWWWAuthenticateParams,
} from '@modelcontextprotocol/sdk/client/auth.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Agent } from 'undici';

import { createUiamOAuthAccessToken, MOCK_IDP_UIAM_OAUTH_BASE_URL } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../fixtures';

const MCP_ENDPOINT = 'api/agent_builder/mcp';

const tlsAgent = new Agent({ connect: { rejectUnauthorized: false } });

const insecureFetch: typeof fetch = (url, init) => {
  return fetch(url, { ...init, dispatcher: tlsAgent } as RequestInit);
};

apiTest.describe(
  '[NON-MKI] MCP OAuth discovery and SDK client flow',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let oauthAccessToken: string;
    let kibanaBaseUrl: string;

    apiTest.beforeAll(async ({ kbnUrl, config: { organizationId, projectType } }) => {
      kibanaBaseUrl = new URL(kbnUrl.get()).origin;

      oauthAccessToken = await createUiamOAuthAccessToken({
        username: '1234567890',
        organizationId: organizationId!,
        projectType: projectType!,
        roles: ['admin'],
        email: 'elastic_admin@elastic.co',
        audience: `${kibanaBaseUrl}/`,
      });
    });

    apiTest(
      'should discover OAuth protected resource metadata from Kibana',
      async ({ apiClient }) => {
        const resourceMetadata = await discoverOAuthProtectedResourceMetadata(
          new URL(`${kibanaBaseUrl}/${MCP_ENDPOINT}`),
          {},
          insecureFetch
        );

        expect(resourceMetadata.authorization_servers).toBeDefined();
        expect(resourceMetadata.authorization_servers).toContain(MOCK_IDP_UIAM_OAUTH_BASE_URL);

        // Verify apiClient can also reach the well-known endpoint
        const response = await apiClient.get('.well-known/oauth-protected-resource', {
          headers: COMMON_HEADERS,
          responseType: 'json',
        });
        expect(response.statusCode).toBe(200);
      }
    );

    apiTest(
      'should discover authorization server metadata from UIAM OAuth',
      async ({ apiClient }) => {
        const resourceMetadata = await discoverOAuthProtectedResourceMetadata(
          new URL(`${kibanaBaseUrl}/${MCP_ENDPOINT}`),
          {},
          insecureFetch
        );

        const authServerUrl = resourceMetadata.authorization_servers![0];
        const authServerMetadata = await discoverAuthorizationServerMetadata(authServerUrl, {
          fetchFn: insecureFetch,
        });

        expect(authServerMetadata).toBeDefined();
        expect(authServerMetadata!.token_endpoint).toBeDefined();

        // Verify apiClient can reach path-aware fallback
        const response = await apiClient.get(
          `.well-known/oauth-protected-resource/${MCP_ENDPOINT}`,
          { headers: COMMON_HEADERS, responseType: 'json' }
        );
        expect(response.statusCode).toBe(200);
      }
    );

    apiTest(
      'should return 401 with WWW-Authenticate resource_metadata on unauthenticated MCP request',
      async ({ apiClient }) => {
        const response = await insecureFetch(new URL(`${kibanaBaseUrl}/${MCP_ENDPOINT}`), {
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
        });

        expect(response.status).toBe(401);

        const { resourceMetadataUrl } = extractWWWAuthenticateParams(response);
        expect(resourceMetadataUrl).toBeDefined();
        expect(resourceMetadataUrl!.pathname).toBe('/.well-known/oauth-protected-resource');

        const body = await response.json();
        expect(body).toStrictEqual({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32000, message: 'Unauthorized' },
        });

        // Also verify via apiClient that unauthenticated POST returns 401
        const apiResponse = await apiClient.post(MCP_ENDPOINT, {
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
      'should complete full MCP handshake with OAuth token via SDK client',
      async ({ apiClient }) => {
        // Verify the token works via apiClient first
        const verifyResponse = await apiClient.post(MCP_ENDPOINT, {
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
          new URL(`${kibanaBaseUrl}/${MCP_ENDPOINT}`),
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

        const client = new Client({ name: 'scout-mcp-test', version: '1.0.0' });

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
