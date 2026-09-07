/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import * as cheerio from 'cheerio';
import { parse as parseCookie } from 'tough-cookie';
import { Agent } from 'undici';

import { createSAMLResponse } from '@kbn/mock-idp-utils';

import { SAML_USERNAME, UIAM_SAML_ACS_URL } from './constants';

const tlsAgent = new Agent({ connect: { rejectUnauthorized: false } });

const insecureFetch: typeof fetch = (url, init) => {
  return fetch(url, { ...init, dispatcher: tlsAgent } as RequestInit);
};

/**
 * OAuthClientProvider that drives UIAM's SAML-backed authorization_code flow.
 */
export class UiamConformanceOAuthProvider implements OAuthClientProvider {
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
      parseCookie(resp.headers.get('set-cookie') ?? '')!.cookieString();

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
