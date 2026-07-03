/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { Agent } from 'undici';
import type { Logger } from '@kbn/core/server';
import type {
  Binding,
  BindingsResponseBody,
  BindingViewBody,
  ListBindingsResult,
  ListPageInput,
  ListTenantsResult,
  RelayClient,
  RelayClientTlsOptions,
  StartInstallRequestBody,
  StartInstallResponseBody,
  StartSlackInstallInput,
  StartSlackInstallResult,
  Tenant,
  TenantsResponseBody,
  TenantViewBody,
} from './types';
import { RelayResponseError, RelayUnreachableError } from './errors';

const buildListQueryString = ({ limit, cursor }: ListPageInput): string => {
  const params = new URLSearchParams();
  if (limit !== undefined) {
    params.set('limit', String(limit));
  }
  if (cursor !== undefined) {
    params.set('cursor', cursor);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

const tenantFromWire = (tenant: TenantViewBody): Tenant => ({
  surface: tenant.surface,
  tenantKey: tenant.tenant_key,
  deploymentRef: tenant.deployment_ref,
  status: tenant.status,
});

const bindingFromWire = (binding: BindingViewBody): Binding => ({
  surface: binding.surface,
  tenantKey: binding.tenant_key,
  scope: binding.scope,
  deploymentRef: binding.deployment_ref,
});

export interface RelayClientOptions {
  /** Base URL of the relay-service, e.g. `https://relay.elastic.co`. */
  baseUrl: string;
  /** Outbound TLS settings for the `fetch` connection, e.g. an mTLS client certificate. */
  tls?: RelayClientTlsOptions;
  logger: Logger;
}

/**
 * Thin HTTP client for the Elastic relay-service. In production the relay
 * derives the deployment identity from the mTLS proxy's XFCC header, injected
 * by the cloud egress proxy downstream — this client sends no auth header
 * itself.
 */
export class RelayClientImpl implements RelayClient {
  private readonly baseUrl: string;
  private readonly logger: Logger;
  private readonly dispatcher: Agent | undefined;

  constructor({ baseUrl, tls, logger }: RelayClientOptions) {
    // Trim a trailing slash so `${this.baseUrl}/v1/...` never doubles up.
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.logger = logger;
    this.dispatcher = this.createDispatcher(tls);
  }

  /**
   * Builds a custom dispatcher for the native `fetch` to use custom TLS
   * connection settings. Mirrors `UiamService#createFetchDispatcher`
   * (`x-pack/platform/plugins/shared/security/server/uiam/uiam_service.ts`).
   */
  private createDispatcher(tls?: RelayClientTlsOptions): Agent | undefined {
    const verificationMode = tls?.verificationMode ?? 'full';

    const readFile = (file: string) => readFileSync(file, 'utf8');

    // Read the client certificate and key for mTLS from PEM files.
    const cert = tls?.certificate ? readFile(tls.certificate) : undefined;
    const key = tls?.key ? readFile(tls.key) : undefined;

    // Read CA certificate(s) from the file path(s) defined in the config.
    const ca = tls?.certificateAuthorities
      ? (Array.isArray(tls.certificateAuthorities)
          ? tls.certificateAuthorities
          : [tls.certificateAuthorities]
        ).map((caPath) => readFile(caPath))
      : undefined;

    // If we don't have any custom TLS settings and full verification is
    // requested, we don't need a custom dispatcher — that's the default
    // `fetch` behavior.
    if (!ca && !cert && !key && verificationMode === 'full') {
      return undefined;
    }

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

  private async handleError(url: string, cause: Error | Response): Promise<never> {
    if ('status' in cause) {
      const text = await cause.text().catch(() => '');
      this.logger.error(
        `relay-service responded ${cause.status} to ${url}${text ? `: ${text}` : ''}`
      );
      throw new RelayResponseError(
        `Relay service returned an error (status ${cause.status})`,
        cause.status
      );
    }

    const message = cause.message;
    this.logger.error(`relay-service request to ${url} failed: ${message}`);
    throw new RelayUnreachableError(`Failed to reach the relay service: ${message}`, { cause });
  }

  /** Sends the request and parses the JSON body, routing any failure through `handleError`. */
  private async request<T>(url: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        // Undici's `fetch` supports a non-standard `dispatcher` option (not part of
        // the DOM `RequestInit` type) to route the request through a custom TLS
        // connection, see https://github.com/nodejs/undici/pull/1411.
        ...(this.dispatcher ? { dispatcher: this.dispatcher } : {}),
      });
    } catch (error) {
      return this.handleError(url, error instanceof Error ? error : new Error(String(error)));
    }

    if (!response.ok) {
      return this.handleError(url, response);
    }

    return (await response.json()) as T;
  }

  async startSlackInstall(input: StartSlackInstallInput): Promise<StartSlackInstallResult> {
    const url = `${this.baseUrl}/v1/slack/install`;
    const body: StartInstallRequestBody = {
      kibana_api_key: input.kibanaApiKey,
      created_by_user_key: input.createdByUserKey,
    };

    const responseBody = await this.request<StartInstallResponseBody>(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return { authorizeUrl: responseBody.authorize_url };
  }

  async listTenants(input: ListPageInput = {}): Promise<ListTenantsResult> {
    const url = `${this.baseUrl}/v1/tenants${buildListQueryString(input)}`;

    const responseBody = await this.request<TenantsResponseBody>(url, {
      method: 'GET',
      headers: {},
    });
    return {
      tenants: responseBody.tenants.map(tenantFromWire),
      nextCursor: responseBody.next_cursor,
    };
  }

  async listBindings(input: ListPageInput = {}): Promise<ListBindingsResult> {
    const url = `${this.baseUrl}/v1/bindings${buildListQueryString(input)}`;

    const responseBody = await this.request<BindingsResponseBody>(url, {
      method: 'GET',
      headers: {},
    });
    return {
      bindings: responseBody.bindings.map(bindingFromWire),
      nextCursor: responseBody.next_cursor,
    };
  }
}
