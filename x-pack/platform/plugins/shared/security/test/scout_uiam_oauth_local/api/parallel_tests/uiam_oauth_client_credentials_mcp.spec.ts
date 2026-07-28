/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import * as cheerio from 'cheerio';
import { Agent } from 'undici';

import { AGENT_BUILDER_UIAM_OAUTH_CLIENT_MANAGEMENT_SETTING_ID } from '@kbn/management-settings-ids';
import { createSAMLResponse, MOCK_IDP_UIAM_OAUTH_BASE_URL } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_UNSAFE_HEADERS } from '../fixtures';

const MCP_ENDPOINT = 'api/agent_builder/mcp';
const CLIENTS_BASE = 'internal/security/oauth/clients';
const REDIRECT_URI = 'https://example.com/callback';
const SAML_USERNAME = '1234567890';
const UIAM_SAML_ACS_URL = MOCK_IDP_UIAM_OAUTH_BASE_URL.replace('/oauth2', '/saml/consume');

const tlsAgent = new Agent({ connect: { rejectUnauthorized: false } });

const insecureFetch: typeof fetch = (url, init) => {
  return fetch(url, { ...init, dispatcher: tlsAgent } as RequestInit);
};

/**
 * OAuthClientProvider that drives UIAM's SAML-backed authorization_code flow.
 */
class UiamConformanceOAuthProvider implements OAuthClientProvider {
  private _codeVerifier = '';
  private _tokens: OAuthTokens | undefined;
  private _capturedCode: string | undefined;

  constructor(
    private readonly clientId: string,
    private readonly redirectUri: string,
    private readonly organizationId: string,
    private readonly projectType: string
  ) {}

  public get redirectUrl() {
    return new URL(this.redirectUri);
  }
  public get clientMetadata() {
    return { client_name: 'scout-mcp', redirect_uris: [this.redirectUri] };
  }
  clientInformation() {
    return { client_id: this.clientId };
  }
  saveClientInformation() {}
  tokens() {
    return this._tokens;
  }
  saveTokens(t: OAuthTokens) {
    this._tokens = t;
  }
  saveCodeVerifier(v: string) {
    this._codeVerifier = v;
  }
  codeVerifier() {
    return this._codeVerifier;
  }
  public get capturedCode() {
    return this._capturedCode;
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    const cookiesFrom = (resp: Response) =>
      (resp.headers as Headers & { getSetCookie?(): string[] })
        .getSetCookie?.()
        ?.map((c) => c.split(';')[0])
        .join('; ') ?? '';

    // Hop 1: authorize → /saml/initiate
    const r1 = await insecureFetch(authorizationUrl.toString(), { redirect: 'manual' });
    const samlInitiateUrl = r1.headers.get('location')!;

    // Hop 2: /saml/initiate → sets saml_state cookie + redirects to mock IdP.
    const r2 = await insecureFetch(samlInitiateUrl, { redirect: 'manual' });
    const samlStateCookieValue = cookiesFrom(r2)
      .split('; ')
      .find((c) => c.startsWith('saml_state='))!
      .slice('saml_state='.length);
    const { sub: authnRequestId, sp_entity_id: spEntityId } = JSON.parse(
      Buffer.from(samlStateCookieValue.split('.')[1], 'base64url').toString()
    ) as {
      sub: string;
      sp_entity_id: string;
    };

    const SAMLResponse = await createSAMLResponse({
      username: SAML_USERNAME,
      email: 'elastic_admin@elastic.co',
      roles: ['admin'],
      authnRequestId,
      acsUrl: UIAM_SAML_ACS_URL,
      spEntityId,
      serverless: {
        uiamEnabled: true,
        organizationId: this.organizationId,
        projectType: this.projectType,
      },
    });

    // POST SAMLResponse to UIAM's ACS with the saml_state cookie.
    const acsResp = await insecureFetch(UIAM_SAML_ACS_URL, {
      method: 'POST',
      headers: { Cookie: `saml_state=${samlStateCookieValue}` },
      body: new URLSearchParams({ SAMLResponse }),
      redirect: 'manual',
    });

    // ACS either redirects straight to the callback (already consented) or to
    // the consent page; if the latter, submit it to get the callback URL.
    let location = acsResp.headers.get('location') ?? '';
    if (location && !location.startsWith(this.redirectUri)) {
      const acsCookies = cookiesFrom(acsResp);

      const resp = await insecureFetch(new URL(location), {
        redirect: 'manual',
        headers: { Cookie: acsCookies },
      });

      if (resp.status === 200) {
        // First app connection: UIAM shows a consent screen before issuing the code.
        const html = await resp.text().catch(() => '');
        const consentToken = cheerio.load(html)('input[name="consent_token"]').val() as
          | string
          | undefined;
        if (!consentToken) throw new Error(`Missing consent_token in consent page`);
        // POST back to the full consent URL (including ?state=...) so UIAM can
        // correlate the request. new URL('authorize', location) would strip the query string.
        const consentResp = await insecureFetch(location, {
          method: 'POST',
          redirect: 'manual',
          headers: { Cookie: acsCookies },
          body: new URLSearchParams({
            consent_token: consentToken,
            action: 'authorize',
          }),
        });
        location = consentResp.headers.get('location') ?? '';
      } else {
        location = resp.headers.get('location') ?? '';
      }
    }

    this._capturedCode = new URL(location).searchParams.get('code') ?? undefined;
    if (!this._capturedCode) throw new Error(`No auth code in callback: ${location}`);
  }
}

apiTest.describe(
  '[NON-MKI] MCP OAuth authorization_code flow via SDK StreamableHTTPClientTransport',
  { tag: [...tags.serverless.security.complete] },
  () => {
    apiTest(
      'should complete full MCP handshake via SAML-backed authorization_code flow',
      async ({ apiClient, kbnClient, kbnUrl, config: { organizationId, projectType } }) => {
        const kibanaBaseUrl = new URL(kbnUrl.get()).origin;

        await kbnClient.uiSettings.update({
          [AGENT_BUILDER_UIAM_OAUTH_CLIENT_MANAGEMENT_SETTING_ID]: true,
        });

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
        const cookie = samlCallback.headers['set-cookie'][0].split(';')[0];
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
            requestInit: { headers: { 'x-elastic-internal-origin': 'kibana' } },
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
          try {
            await client.connect(transport2);
            const { tools } = await client.listTools();
            expect(tools.length).toBeGreaterThan(0);
          } finally {
            await client.close();
          }
        } finally {
          await apiClient.post(`${CLIENTS_BASE}/${encodeURIComponent(clientId)}/_revoke`, {
            headers: authHeaders,
            responseType: 'json',
            body: { reason: 'scout cleanup' },
          });
          await kbnClient.uiSettings.unset(AGENT_BUILDER_UIAM_OAUTH_CLIENT_MANAGEMENT_SETTING_ID);
        }
      }
    );
  }
);
