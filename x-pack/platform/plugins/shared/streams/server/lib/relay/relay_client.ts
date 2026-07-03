/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  Binding,
  BindingsResponseBody,
  BindingViewBody,
  ListBindingsResult,
  ListPageInput,
  ListTenantsResult,
  RelayClient,
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
  /**
   * Extra headers sent with every request, e.g. the `x-forwarded-client-cert`
   * header a local dev proxy would otherwise inject. Configured via
   * `xpack.streams.relayService.headers`. May override the default
   * `content-type` header.
   */
  headers?: Record<string, string>;
  // TODO tls options
  logger: Logger;
}

/**
 * Thin HTTP client for the Elastic relay-service. In production the relay
 * derives the deployment identity from the mTLS proxy's XFCC header, injected
 * by the cloud egress proxy downstream — this client sends no auth header
 * itself. For local development, the XFCC header (or any other header) can be
 * supplied via the `headers` option / `xpack.streams.relayService.headers`.
 */
export class RelayClientImpl implements RelayClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly logger: Logger;

  constructor({ baseUrl, headers, logger }: RelayClientOptions) {
    // Trim a trailing slash so `${this.baseUrl}/v1/...` never doubles up.
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.headers = headers ?? {};
    this.logger = logger;
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
      response = await fetch(url, init);
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
        ...this.headers,
      },
      body: JSON.stringify(body),
    });
    return { authorizeUrl: responseBody.authorize_url };
  }

  async listTenants(input: ListPageInput = {}): Promise<ListTenantsResult> {
    const url = `${this.baseUrl}/v1/tenants${buildListQueryString(input)}`;

    const responseBody = await this.request<TenantsResponseBody>(url, {
      method: 'GET',
      headers: { ...this.headers },
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
      headers: { ...this.headers },
    });
    return {
      bindings: responseBody.bindings.map(bindingFromWire),
      nextCursor: responseBody.next_cursor,
    };
  }
}
