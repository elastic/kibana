/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import { request } from '../axios_utils';
import { RelayRequestError } from './relay_error';
import type {
  RelayBinding,
  RelayCallbackResponse,
  RelayClaimResponse,
  RelayClientContract,
  RelayInstallRequest,
  RelayInstallResponse,
  RelaySlackChannel,
} from './types';

export interface RelayClientOptions {
  baseUrl: string;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
}

interface RelayErrorResponse {
  message?: string;
}

export class RelayClient implements RelayClientContract {
  private readonly axios = axios.create();
  private readonly baseUrl: URL;
  private readonly configurationUtilities: ActionsConfigurationUtilities;
  private readonly logger: Logger;

  constructor({ baseUrl, configurationUtilities, logger }: RelayClientOptions) {
    this.baseUrl = new URL(baseUrl);
    this.configurationUtilities = configurationUtilities;
    this.logger = logger;
  }

  async startInstall(body: RelayInstallRequest): Promise<RelayInstallResponse> {
    const response = await this.post('/v1/slack/install', body);
    return response.data as RelayInstallResponse;
  }

  async fetchClaim(claimId: string): Promise<RelayClaimResponse> {
    const response = await this.post('/v1/slack/install/claim', { claim_id: claimId });

    if (response.status === 202) {
      return { status: 'pending' };
    }

    const claim = response.data as { tenant_key?: string };
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
    const body = response.data as { bindings?: unknown[] } | undefined;
    if (!body || !Array.isArray(body.bindings)) {
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
  async listChannels(tenantKey: string): Promise<RelaySlackChannel[]> {
    const path = `/v1/slack/tenants/${encodeURIComponent(tenantKey)}/channels`;
    const response = await this.get(path);
    const body = response.data as { channels?: unknown[] } | undefined;
    if (!body || !Array.isArray(body.channels)) {
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

  isRelayOrigin(url: string): boolean {
    try {
      return new URL(url).origin === this.baseUrl.origin;
    } catch {
      return false;
    }
  }

  async postCallback(
    url: string,
    body: unknown,
    signal: AbortSignal
  ): Promise<RelayCallbackResponse> {
    if (!this.isRelayOrigin(url)) {
      throw new Error('Callback URL does not match the configured Relay origin');
    }

    const response = await this.sendRequest(url, body, signal);
    return { status: response.status };
  }

  private async post(path: string, body: unknown): Promise<AxiosResponse> {
    return this.send(path, 'post', body);
  }

  private async get(path: string): Promise<AxiosResponse> {
    return this.send(path, 'get');
  }

  private async send(path: string, method: 'get' | 'post', data?: unknown): Promise<AxiosResponse> {
    const response = await this.sendRequest(
      new URL(path, this.baseUrl).toString(),
      data,
      undefined,
      method
    );
    if (response.status >= 200 && response.status < 300) {
      return response;
    }

    const relayMessage = (response.data as RelayErrorResponse | undefined)?.message;
    throw new RelayRequestError(path, response.status, relayMessage);
  }

  private sendRequest(
    url: string,
    data: unknown,
    signal?: AbortSignal,
    method: 'get' | 'post' = 'post'
  ): Promise<AxiosResponse> {
    return request({
      axios: this.axios,
      url,
      method,
      data,
      headers: { 'Content-Type': 'application/json' },
      configurationUtilities: this.configurationUtilities,
      sslOverrides: this.configurationUtilities.getRelaySSLSettings(),
      logger: this.logger,
      signal,
      maxRedirects: 0,
      validateStatus: () => true,
    });
  }
}
