/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { Agent } from 'undici';
import type { Logger } from '@kbn/core/server';
import type { RelayServiceTlsConfig } from '../../../common/config';
import { RelayRequestError } from './relay_error';

const REQUEST_TIMEOUT_MS = 30_000;

export type RelayClientTlsOptions = RelayServiceTlsConfig;

export interface RelayClientOptions {
  /** Base URL of the Relay service, e.g. `https://relay.elastic.co`. */
  baseUrl: string;
  /** Outbound TLS settings for the `fetch` connection, e.g. an mTLS client certificate. */
  tls?: RelayClientTlsOptions;
  logger: Logger;
}

/** Extends the DOM `RequestInit` with undici's non-standard `dispatcher` option, see below. */
interface FetchInit extends RequestInit {
  dispatcher?: Agent;
}

/**
 * Request/response contracts mirror relay-service `src/contracts/http/slack.ts`
 * (see relay-service#78). Deployment identity is asserted at the transport layer
 * (mTLS proxy, XFCC header) and is never part of the request body.
 */
export interface RelayInstallRequest {
  /**
   * The Kibana-minted managed ES API key (base64 `id:api_key`, min 32 chars) the
   * Relay stores and presents to Agent Builder. The caller owns this credential;
   * the Relay never mints one. Field name per the merged contract (relay-service
   * commit ff5d067, `StartInstallRequest`).
   */
  kibana_api_key: string;
  /** Optional audit marker for who initiated the install. */
  created_by_user_key?: string;
}

export interface RelayInstallResponse {
  authorize_url: string;
  claim_id: string;
}

export type RelayClaimResponse = { status: 'pending' } | { status: 'complete'; tenant_key: string };

/**
 * Thin HTTP client for the Nightshift Relay service. Kibana -> Relay transport runs
 * through the deployment's mTLS proxy (identity via XFCC), configured at the infra
 * layer; `baseUrl` is the operator-configured base URL. Not user-supplied, so this
 * is not an SSRF vector.
 */
export class RelayClient {
  private readonly baseUrl: string;
  private readonly dispatcher: Agent | undefined;

  constructor({ baseUrl, tls, logger }: RelayClientOptions) {
    // Trim a trailing slash so `${this.baseUrl}/v1/...` never doubles up.
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.dispatcher = this.createDispatcher(tls, logger);
  }

  /**
   * Builds a custom dispatcher for the native `fetch` to use custom TLS connection
   * settings. Mirrors `UiamService#createFetchDispatcher`
   * (`x-pack/platform/plugins/shared/security/server/uiam/uiam_service.ts`).
   */
  private createDispatcher(tls: RelayClientTlsOptions | undefined, logger: Logger) {
    const verificationMode = tls?.verificationMode ?? 'full';

    const readFile = (file: string) => readFileSync(file, 'utf8');

    // Read the client certificate and key for mTLS from PEM files.
    const cert = tls?.certificate ? readFile(tls.certificate) : undefined;
    const key = tls?.key ? readFile(tls.key) : undefined;

    // Read CA certificate(s) from the file path(s) defined in the config.
    const caPaths = tls?.certificateAuthorities;
    const ca = caPaths ? (Array.isArray(caPaths) ? caPaths : [caPaths]).map(readFile) : undefined;

    // If we don't have any custom TLS settings and full verification is requested,
    // we don't need a custom dispatcher — that's the default `fetch` behavior.
    if (!ca && !cert && !key && verificationMode === 'full') {
      return undefined;
    }

    logger.debug(`Using a custom TLS dispatcher for the Relay client (mode: ${verificationMode})`);

    return new Agent({
      connect: {
        ca,
        cert,
        key,
        allowPartialTrustChain: true,
        rejectUnauthorized: verificationMode !== 'none',
        // By default, Node.js checks the server identity against the SAN/CN
        // in the certificate.
        ...(verificationMode === 'certificate' ? { checkServerIdentity: () => undefined } : {}),
      },
    });
  }

  async startInstall(body: RelayInstallRequest): Promise<RelayInstallResponse> {
    const { response } = await this.post('/v1/slack/install', body);
    return (await response.json()) as RelayInstallResponse;
  }

  /**
   * Completion poll. `claim_id` (issued by the install start) is required in the
   * body (`parseClaimInstallInput` on relay main); XFCC identity verifies the
   * caller owns the claim. 202 while the Slack OAuth consent is outstanding,
   * 200 once fulfilled. No secret is ever returned.
   */
  async fetchClaim(claimId: string): Promise<RelayClaimResponse> {
    const { response } = await this.post('/v1/slack/install/claim', { claim_id: claimId });

    if (response.status === 202) {
      return { status: 'pending' };
    }

    const claim = (await response.json()) as { tenant_key: string };
    return { status: 'complete', tenant_key: claim.tenant_key };
  }

  /** Unbind on disconnect. Not yet implemented Relay-side; tracked as a follow-up. */
  async unbind(): Promise<void> {
    await this.post('/v1/slack/uninstall', {});
  }

  private async post(path: string, body: unknown): Promise<{ response: Response }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      // Undici's `fetch` supports a non-standard `dispatcher` option (not part of the
      // DOM `RequestInit` type) to route the request through a custom TLS connection,
      // see https://github.com/nodejs/undici/pull/1411.
      const init: FetchInit = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
        dispatcher: this.dispatcher,
      };
      const response = await fetch(new URL(path, this.baseUrl), init);
      if (!response.ok) {
        // Relay error bodies carry `{ message }` (e.g. "workspace already bound");
        // preserve it so callers can surface the actual reason.
        let relayMessage: string | undefined;
        try {
          relayMessage = ((await response.json()) as { message?: string }).message;
        } catch {
          // Non-JSON error body; the status code is all we have.
        }
        throw new RelayRequestError(path, response.status, relayMessage);
      }
      return { response };
    } catch (error) {
      // Logging is owned by callers: they know whether a failure is expected
      // (uninstall 404), transient (keep polling), or terminal (surface to user).
      throw error instanceof Error ? error : new Error(`Relay request to ${path} failed`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
