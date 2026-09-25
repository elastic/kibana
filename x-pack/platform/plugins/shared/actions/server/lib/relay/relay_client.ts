/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { Logger } from '@kbn/core/server';
import type { SystemIdentity } from '@kbn/security-plugin-types-server';
import type { ActionsConfigurationUtilities } from '../../actions_config';
import { request } from '../axios_utils';
import { RelayRequestError } from './relay_error';
import type {
  RelayBinding,
  RelayBindingsPage,
  RelayCallbackResponse,
  RelayClaimResponse,
  RelayClientContract,
  RelayApiKeyInstallRequest,
  RelayInstallRequest,
  RelayInstallResponse,
  RelayServiceAccountInstallRequest,
  RelayListBindingsOptions,
  RelayTriggerInput,
  RelayTriggerResponse,
} from './types';

export interface RelayClientOptions {
  baseUrl: string;
  configurationUtilities: ActionsConfigurationUtilities;
  logger: Logger;
  /**
   * Whether to authenticate every Relay request with an ephemeral UIAM token for Kibana's own
   * identity (`xpack.actions.relay.uiam.enabled`). When `false` the Relay identifies Kibana from
   * the mTLS leg alone.
   */
  useSystemIdentity: boolean;
  /**
   * Kibana's own UIAM identity. Resolved on each request because the client is built during
   * `setup`, before the security plugin's start contract exists. `undefined` means UIAM is not
   * configured for this Kibana, or is configured without the client certificate the identity is
   * derived from. Either is a misconfiguration when `useSystemIdentity` is on.
   */
  getSystemIdentity: () => SystemIdentity | undefined;
}

/** Largest page size the Relay accepts on its cursor-paginated list endpoints. */
const RELAY_MAX_PAGE_LIMIT = 200;

interface RelayErrorResponse {
  message?: string;
}

/** Raw shape of the cursor-paginated bindings list response body. */
interface RelayBindingsListResponse {
  bindings?: RelayBinding[];
  next_cursor?: string;
}

/** Raw shape of the `POST /v1/trigger` acknowledgement body. */
interface RelayTriggerResponseBody {
  ref?: string;
  tenant_key?: string;
}

export class RelayClient implements RelayClientContract {
  private readonly axios = axios.create();
  private readonly baseUrl: URL;
  private readonly configurationUtilities: ActionsConfigurationUtilities;
  private readonly logger: Logger;
  private readonly useSystemIdentity: boolean;
  private readonly getSystemIdentity: RelayClientOptions['getSystemIdentity'];

  /** `xpack.actions.relay.uiam.enabled`. */
  get uiamEnabled(): boolean {
    return this.useSystemIdentity;
  }

  constructor({
    baseUrl,
    configurationUtilities,
    logger,
    useSystemIdentity,
    getSystemIdentity,
  }: RelayClientOptions) {
    this.baseUrl = new URL(baseUrl);
    this.configurationUtilities = configurationUtilities;
    this.logger = logger;
    this.useSystemIdentity = useSystemIdentity;
    this.getSystemIdentity = getSystemIdentity;
  }

  async startInstall(body: RelayInstallRequest): Promise<RelayInstallResponse> {
    const wireBody = toRelayInstallWireBody(body, this.uiamEnabled);
    const credential = installCredential(wireBody);
    try {
      const response = await this.post('/v1/slack/install', wireBody);
      return response.data as RelayInstallResponse;
    } catch (error) {
      // Axios and Relay errors can echo the request. Drop that copy: the
      // credential must not leave this method on the failure path.
      throw sanitizeInstallFailure(error, credential);
    }
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
   * Fetch a single page of the calling deployment's own SUB (channel-scoped) bindings for a
   * given Slack workspace tenant — the "connected channels" inventory. Each entry carries its
   * persisted display snapshot (`display_name`, `visibility`). Returns the page's items plus
   * the Relay's opaque `next_cursor` (as `nextCursor`); pass it back via `options.cursor` to
   * read the next page.
   */
  async listBindings(
    tenantKey: string,
    options: RelayListBindingsOptions = {}
  ): Promise<RelayBindingsPage> {
    const query = new URLSearchParams({
      limit: String(options.limit ?? RELAY_MAX_PAGE_LIMIT),
    });
    if (options.cursor) {
      query.set('cursor', options.cursor);
    }

    const response = await this.get(
      `/v1/slack/tenants/${encodeURIComponent(tenantKey)}/bindings?${query.toString()}`
    );
    const body = response.data as RelayBindingsListResponse | undefined;

    if (body?.bindings === undefined) {
      return { bindings: [], nextCursor: body?.next_cursor };
    }

    if (!Array.isArray(body.bindings)) {
      throw new RelayRequestError(
        `/v1/slack/tenants/${encodeURIComponent(tenantKey)}/bindings`,
        response.status,
        'Relay invalid response format missing expected `bindings` array'
      );
    }

    const bindings: RelayBinding[] = body.bindings.map(
      ({ scope_type, scope_id, display_name, visibility }) => ({
        scope_type,
        scope_id,
        display_name,
        visibility,
      })
    );

    return { bindings, nextCursor: body?.next_cursor };
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

  /** Post to a bound channel. One this deployment does not own is rejected with a 403, not delivered. */
  async trigger({
    tenantKey,
    channel,
    message,
    threadTs,
  }: RelayTriggerInput): Promise<RelayTriggerResponse> {
    const response = await this.post('/v1/slack/trigger', {
      tenant_key: tenantKey,
      channel,
      message,
      ...(threadTs ? { thread_ts: threadTs } : {}),
    });

    const body = response.data as RelayTriggerResponseBody | undefined;
    if (typeof body?.ref !== 'string' || body.ref.length === 0) {
      throw new RelayRequestError(
        '/v1/slack/trigger',
        response.status,
        'Relay invalid response format missing expected `ref`'
      );
    }
    return { ref: body.ref, tenantKey: body?.tenant_key ?? tenantKey };
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

    const response = await this.sendRequest(url, body, 'post', signal);
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

  private async send(
    path: string,
    method: 'get' | 'post' | 'put' | 'delete',
    data?: unknown
  ): Promise<AxiosResponse> {
    const response = await this.sendRequest(new URL(path, this.baseUrl).toString(), data, method);
    if (response.status >= 200 && response.status < 300) {
      return response;
    }

    const relayMessage = (response.data as RelayErrorResponse | undefined)?.message;
    throw new RelayRequestError(path, response.status, relayMessage);
  }

  /**
   * The Relay runs in a different region from this Kibana, so the proxy-verified mTLS identity
   * alone is not enough: the Relay forwards this bearer token together with Kibana's certificate
   * SANs to UIAM. A fresh token is minted per request.
   */
  private async createSystemIdentityToken(signal?: AbortSignal): Promise<string> {
    const systemIdentity = this.getSystemIdentity();
    if (!systemIdentity) {
      throw new Error(
        'Cannot authenticate the Relay request: `xpack.actions.relay.uiam.enabled` is set but this Kibana has no UIAM system identity. Configure `xpack.security.uiam` with a client certificate (`ssl.certificate` and `ssl.key`).'
      );
    }
    return await systemIdentity.createEphemeralToken(signal);
  }

  private async sendRequest(
    url: string,
    data: unknown,
    method: 'get' | 'post' | 'put' | 'delete' = 'post',
    signal?: AbortSignal
  ): Promise<AxiosResponse> {
    const token = this.useSystemIdentity ? await this.createSystemIdentityToken(signal) : undefined;

    return request({
      axios: this.axios,
      url,
      method,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      configurationUtilities: this.configurationUtilities,
      sslOverrides: this.configurationUtilities.getRelaySSLSettings(),
      logger: this.logger,
      signal,
      maxRedirects: 0,
      validateStatus: () => true,
    });
  }
}

const installCredential = (body: RelayInstallRequest): string =>
  'uiam_service_account_id' in body
    ? (body as RelayServiceAccountInstallRequest).uiam_service_account_id
    : (body as RelayApiKeyInstallRequest).kibana_api_key;

/**
 * Copies the install body down to exactly one credential. A caller that sets
 * both, or the credential that does not match the feature flag, is rejected
 * before anything is sent.
 */
const toRelayInstallWireBody = (
  body: RelayInstallRequest,
  uiamEnabled: boolean
): RelayInstallRequest => {
  const apiKey = 'kibana_api_key' in body ? body.kibana_api_key : undefined;
  const serviceAccountId =
    'uiam_service_account_id' in body ? body.uiam_service_account_id : undefined;
  const hasApiKey = typeof apiKey === 'string' && apiKey.length > 0;
  const hasServiceAccountId = typeof serviceAccountId === 'string' && serviceAccountId.length > 0;

  if (hasApiKey === hasServiceAccountId) {
    throw new Error(
      'Relay install requires exactly one of `kibana_api_key` or `uiam_service_account_id`.'
    );
  }
  if (uiamEnabled !== hasServiceAccountId) {
    throw new Error(
      uiamEnabled
        ? 'Relay UIAM install must send `uiam_service_account_id` only.'
        : 'Relay install must send `kibana_api_key` only.'
    );
  }

  const shared = {
    kibana_url: body.kibana_url,
    kibana_version: body.kibana_version,
    license_info: body.license_info,
    ...(body.created_by_user_key ? { created_by_user_key: body.created_by_user_key } : {}),
  };

  if (hasServiceAccountId && serviceAccountId !== undefined) {
    const wireBody: RelayServiceAccountInstallRequest = {
      ...shared,
      uiam_service_account_id: serviceAccountId,
    };
    return wireBody;
  }
  const wireBody: RelayApiKeyInstallRequest = { ...shared, kibana_api_key: apiKey as string };
  return wireBody;
};

const redactCredential = (value: string, credential: string): string => {
  if (credential.length === 0) {
    return value;
  }
  return value.split(credential).join('[redacted]');
};

/** Rebuilds an install failure so the request body cannot ride out on it. */
const sanitizeInstallFailure = (error: unknown, credential: string): Error => {
  if (error instanceof RelayRequestError) {
    const relayMessage =
      error.relayMessage === undefined
        ? undefined
        : redactCredential(error.relayMessage, credential);
    return new RelayRequestError('/v1/slack/install', error.statusCode, relayMessage);
  }
  const message =
    error instanceof Error ? redactCredential(error.message, credential) : 'Relay install failed';
  return new Error(message);
};
