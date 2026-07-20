/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { Agent } from 'undici';
import type { Logger } from '@kbn/core/server';
import { getNodeSSLOptions } from '@kbn/actions-utils';
import type {
  RelayBinding,
  RelayChannel,
  RelayClaimResponse,
  RelayInstallRequest,
  RelayInstallResponse,
} from '@kbn/significant-events-schema';
import type { RelayServiceTlsConfig } from '../../../common/config';
import { RelayRequestError } from './relay_error';

const REQUEST_TIMEOUT_MS = 30_000;

export interface RelayClientOptions {
  /** Base URL of the Relay service, e.g. `https://relay.elastic.co`. */
  baseUrl: string;
  /** Outbound TLS settings for the `fetch` connection, e.g. an mTLS client certificate. */
  tls?: RelayServiceTlsConfig;
  logger: Logger;
}

/** Extends the DOM `RequestInit` with undici's non-standard `dispatcher` option, see below. */
interface FetchInit extends RequestInit {
  dispatcher?: Agent;
}

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
  private createDispatcher(tls: RelayServiceTlsConfig | undefined, logger: Logger) {
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

    const { rejectUnauthorized, checkServerIdentity } = getNodeSSLOptions(logger, verificationMode);
    return new Agent({
      connect: {
        ca,
        cert,
        key,
        allowPartialTrustChain: true,
        rejectUnauthorized,
        checkServerIdentity,
      },
    });
  }

  async startInstall(body: RelayInstallRequest): Promise<RelayInstallResponse> {
    const response = await this.post('/v1/slack/install', body);
    return (await response.json()) as RelayInstallResponse;
  }

  /**
   * Completion poll. `claim_id` (issued by the install start) is required in the
   * body (`parseClaimInstallInput` on relay main); XFCC identity verifies the
   * caller owns the claim. 202 while the Slack OAuth consent is outstanding,
   * 200 once fulfilled. No secret is ever returned.
   */
  async fetchClaim(claimId: string): Promise<RelayClaimResponse> {
    const response = await this.post('/v1/slack/install/claim', { claim_id: claimId });

    if (response.status === 202) {
      return { status: 'pending' };
    }

    const claim = (await response.json()) as { tenant_key?: string };
    return { status: 'complete', tenant_key: claim.tenant_key };
  }

  /** Unbind a single workspace binding identified by its tenant key. */
  async unbind(tenantKey: string): Promise<void> {
    await this.post('/v1/slack/uninstall', { tenant_key: tenantKey });
  }

  /**
   * List the bindings for a given Slack workspace tenant, as seen from this deployment.
   * Returns DEFAULT + SUB scopes only (SECONDARY / USER are filtered by the Relay).
   */
  async listBindings(tenantKey: string): Promise<RelayBinding[]> {
    const path = `/v1/slack/tenants/${encodeURIComponent(tenantKey)}/bindings`;
    const response = await this.get(path);
    const body = (await response.json()) as { bindings?: unknown[] };
    if (!Array.isArray(body.bindings)) {
      return [];
    }
    return body.bindings.map((entry) => {
      const e = entry as {
        scope_type?: string;
        scope_id?: string;
        display_name?: string;
        status: RelayBinding['status'];
      };
      return {
        scope_type: e.scope_type,
        scope_id: e.scope_id,
        displayName: e.display_name,
        status: e.status,
      };
    });
  }

  /**
   * List all Slack channels the bot is currently a member of for the given tenant workspace.
   * Returns `{ id, name }[]`. Use alongside `listBindings` to derive `not_bound` channels.
   */
  async listChannels(tenantKey: string): Promise<RelayChannel[]> {
    const path = `/v1/slack/tenants/${encodeURIComponent(tenantKey)}/channels`;
    const response = await this.get(path);
    const body = (await response.json()) as { channels?: unknown[] };
    if (!Array.isArray(body.channels)) {
      return [];
    }
    return (body.channels as Array<{ id?: string; name?: string }>)
      .filter((e): e is { id: string; name: string } => e.id != null && e.name != null)
      .map((e) => ({ id: e.id, name: e.name }));
  }

  /** Claim an unclaimed channel (put-if-absent). The caller must hold a DEFAULT or SECONDARY binding for the tenant. */
  async bind(tenantKey: string, channelId: string): Promise<void> {
    await this.post(
      `/v1/slack/tenants/${encodeURIComponent(tenantKey)}/bindings/${encodeURIComponent(
        channelId
      )}/bind`,
      {}
    );
  }

  /** Release a channel binding owned by this deployment. */
  async unbindChannel(tenantKey: string, channelId: string): Promise<void> {
    await this.post(
      `/v1/slack/tenants/${encodeURIComponent(tenantKey)}/bindings/${encodeURIComponent(
        channelId
      )}/unbind`,
      {}
    );
  }

  private async post(path: string, body: unknown): Promise<Response> {
    return this.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async get(path: string): Promise<Response> {
    return this.request(path, { method: 'GET' });
  }

  private async request(path: string, init: FetchInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      // Undici's `fetch` supports a non-standard `dispatcher` option (not part of the
      // DOM `RequestInit` type) to route the request through a custom TLS connection,
      // see https://github.com/nodejs/undici/pull/1411.
      const fetchInit: FetchInit = {
        ...init,
        signal: controller.signal,
        dispatcher: this.dispatcher,
      };
      const response = await fetch(new URL(path, this.baseUrl), fetchInit);
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
      return response;
    } catch (error) {
      // Logging is owned by callers: they know whether a failure is expected
      // (uninstall 404), transient (keep polling), or terminal (surface to user).
      throw error instanceof Error ? error : new Error(`Relay request to ${path} failed`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
