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

/** Largest page size the Relay accepts on its cursor-paginated list endpoints. */
const RELAY_MAX_PAGE_LIMIT = 200;

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
   * List the SUB (channel-scoped) bindings for a given Slack workspace tenant, across all
   * deployments, with caller-relative status. The endpoint is cursor-paginated; this walks
   * every page (following `next_cursor`) and returns the aggregated result. The Relay no
   * longer enriches entries with `display_name` — join against `listChannels` for names.
   */
  async listBindings(tenantKey: string): Promise<RelayBinding[]> {
    return this.collect(`/v1/slack/tenants/${encodeURIComponent(tenantKey)}/bindings`, (data) => {
      const body = data as { bindings?: unknown[] } | undefined;
      if (!body || !Array.isArray(body.bindings)) {
        return [];
      }
      return body.bindings.map((entry) => {
        const e = entry as {
          scope_type?: string;
          scope_id?: string;
          target_ref?: string;
          status: RelayBinding['status'];
        };
        return {
          scope_type: e.scope_type,
          scope_id: e.scope_id,
          target_ref: e.target_ref,
          status: e.status,
        };
      });
    });
  }

  /**
   * List all Slack channels the bot is currently a member of for the given tenant workspace.
   * Returns `{ id, name }[]`. The endpoint is cursor-paginated; this walks every page
   * (following `next_cursor`). Use alongside `listBindings` to derive `not_bound` channels.
   */
  async listChannels(tenantKey: string): Promise<RelaySlackChannel[]> {
    return this.collect(`/v1/slack/tenants/${encodeURIComponent(tenantKey)}/channels`, (data) => {
      const body = data as { channels?: unknown[] } | undefined;
      if (!body || !Array.isArray(body.channels)) {
        return [];
      }
      return (body.channels as Array<{ id?: string; name?: string }>)
        .filter((e): e is RelaySlackChannel => e.id != null && e.name != null)
        .map(({ id, name }) => ({ id, name }));
    });
  }

  /** Claim an unclaimed channel (put-if-absent). The caller must hold a registration for the tenant. */
  async bind(tenantKey: string, channelId: string): Promise<void> {
    await this.put(
      `/v1/slack/tenants/${encodeURIComponent(tenantKey)}/bindings/${encodeURIComponent(
        channelId
      )}/bind`,
      {}
    );
  }

  /** Release a channel binding owned by this deployment. */
  async unbindChannel(tenantKey: string, channelId: string): Promise<void> {
    await this.del(
      `/v1/slack/tenants/${encodeURIComponent(tenantKey)}/bindings/${encodeURIComponent(
        channelId
      )}/unbind`
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

  private async put(path: string, body: unknown): Promise<AxiosResponse> {
    return this.send(path, 'put', body);
  }

  private async del(path: string): Promise<AxiosResponse> {
    return this.send(path, 'delete');
  }

  private async get(path: string): Promise<AxiosResponse> {
    return this.send(path, 'get');
  }

  /**
   * Collect every item from a cursor-paginated GET endpoint. `extract` maps a single page's
   * response body to its items; the pages are walked via {@link paginate} and flattened.
   */
  private async collect<T>(basePath: string, extract: (data: unknown) => T[]): Promise<T[]> {
    const items: T[] = [];
    for await (const page of this.paginate(basePath)) {
      items.push(...extract(page.data));
    }
    return items;
  }

  /**
   * Walk a cursor-paginated GET endpoint, yielding one successful response per page.
   * Follows the response `next_cursor` until it is absent. `?limit=` is fixed to the
   * Relay's `MAX_PAGE_LIMIT` to minimize round-trips. Stops if the Relay ever repeats a
   * cursor, so a misbehaving server can't drive an unbounded request loop.
   */
  private async *paginate(basePath: string): AsyncGenerator<AxiosResponse> {
    const seenCursors = new Set<string>();
    let cursor: string | undefined;
    do {
      const query = new URLSearchParams({ limit: String(RELAY_MAX_PAGE_LIMIT) });
      if (cursor) {
        query.set('cursor', cursor);
      }
      const response = await this.get(`${basePath}?${query.toString()}`);
      yield response;
      cursor = (response.data as { next_cursor?: string } | undefined)?.next_cursor;
      if (cursor && seenCursors.has(cursor)) {
        this.logger.warn(
          `Relay returned a repeated pagination cursor for ${basePath}; stopping pagination`
        );
        return;
      }
      if (cursor) {
        seenCursors.add(cursor);
      }
    } while (cursor);
  }

  private async send(
    path: string,
    method: 'get' | 'post' | 'put' | 'delete',
    data?: unknown
  ): Promise<AxiosResponse> {
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
    method: 'get' | 'post' | 'put' | 'delete' = 'post'
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
