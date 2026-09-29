/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { parse as parseCookie } from 'tough-cookie';
import { Agent } from 'undici';

import { createSAMLResponse } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_UNSAFE_HEADERS } from '../fixtures';
import {
  CLIENTS_BASE,
  MCP_ENDPOINT,
  REDIRECT_URI,
  SAML_USERNAME,
  UiamConformanceOAuthProvider,
} from '../fixtures/oauth_providers';

const tlsAgent = new Agent({ connect: { rejectUnauthorized: false } });

const insecureFetch: typeof fetch = (url, init) => {
  return fetch(url, { ...init, dispatcher: tlsAgent } as RequestInit);
};

apiTest.describe(
  '[NON-MKI] MCP OAuth authorization_code flow via SDK StreamableHTTPClientTransport',
  { tag: [...tags.serverless.security.complete] },
  () => {
    apiTest(
      'should complete full MCP handshake via SAML-backed authorization_code flow',
      async ({ apiClient, kbnUrl, config: { organizationId, projectType } }) => {
        const kibanaBaseUrl = new URL(kbnUrl.get()).origin;

        // Authenticate as admin to access the internal OAuth client management API.
        const samlResp = await createSAMLResponse({
          username: SAML_USERNAME,
          email: 'elastic_admin@elastic.co',
          roles: ['admin'],
          serverless: {
            uiamEnabled: true,
            organizationId: organizationId!,
            projectType: projectType!,
          },
        });
        const samlCallback = await apiClient.post('api/security/saml/callback', {
          body: `SAMLResponse=${encodeURIComponent(samlResp)}`,
        });
        const cookie = parseCookie(samlCallback.headers['set-cookie'][0])!.cookieString();
        const authHeaders = { ...COMMON_UNSAFE_HEADERS, Cookie: cookie };

        const createResponse = await apiClient.post(CLIENTS_BASE, {
          headers: authHeaders,
          responseType: 'json',
          body: {
            client_name: `scout-auth-code-mcp-${Date.now()}`,
            client_type: 'public',
            client_metadata: { owner: 'scout' },
            redirect_uris: [REDIRECT_URI],
          },
        });

        expect(createResponse.statusCode).toBe(200);
        const clientId: string = createResponse.body.id;
        expect(clientId).toBeDefined();

        try {
          const provider = new UiamConformanceOAuthProvider(
            clientId,
            REDIRECT_URI,
            organizationId!,
            projectType!
          );
          const mcpUrl = new URL(`${kibanaBaseUrl}/${MCP_ENDPOINT}`);
          const transportOpts = {
            authProvider: provider,
            fetch: insecureFetch,
          };

          // Phase 1: unauthenticated connect triggers the SAML OAuth flow.
          // The transport gets a 401, calls redirectToAuthorization() (our SAML flow,
          // which captures the code), then throws UnauthorizedError — that's expected.
          const transport1 = new StreamableHTTPClientTransport(mcpUrl, transportOpts);
          const client = new Client({ name: 'scout-mcp', version: '1.0.0' });

          await expect(client.connect(transport1)).rejects.toThrow(UnauthorizedError);
          expect(provider.capturedCode).toBeDefined();

          // Phase 2: exchange the auth code for tokens.
          await transport1.finishAuth(provider.capturedCode!);
          expect(provider.tokens()).toBeDefined();

          // Phase 3: reconnect with stored tokens and verify tool access.
          // transport1 cannot be reused (its AbortController is not reset after close),
          // but the client can connect to a fresh transport.
          const transport2 = new StreamableHTTPClientTransport(mcpUrl, transportOpts);

          await client.connect(transport2);
          const { tools } = await client.listTools();
          expect(tools.length).toBeGreaterThan(0);
          await client.close();
        } finally {
          await apiClient.post(`${CLIENTS_BASE}/${encodeURIComponent(clientId)}/_revoke`, {
            headers: authHeaders,
            responseType: 'json',
            body: { reason: 'scout cleanup' },
          });
        }
      }
    );
  }
);
