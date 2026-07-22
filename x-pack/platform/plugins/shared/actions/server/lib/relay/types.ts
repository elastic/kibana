/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RelayInstallRequest {
  kibana_api_key: string;
  kibana_url: string;
  kibana_version: string;
  license_info: string;
  created_by_user_key?: string;
}

export interface RelayInstallResponse {
  authorize_url: string;
  claim_id: string;
}

export type RelayClaimResponse =
  | { status: 'pending' }
  | { status: 'complete'; tenant_key: string | undefined };

export interface RelayCallbackResponse {
  status: number;
}

/** A single entry from the Relay bindings list (`GET /v1/slack/tenants/:tenantKey/bindings`). */
export interface RelayBinding {
  /** Binding scope type from the Relay: always `"SUB"` for channel-specific bindings. */
  scope_type?: string;
  /** Channel id — present for `SUB`-scope entries. */
  scope_id?: string;
  /**
   * Target ref of the owning deployment — only returned by the Relay for the caller's own
   * bindings (i.e. when `status` is `bound_to_self`).
   */
  target_ref?: string;
  /**
   * Caller-relative binding status from the Relay wire contract.
   * `not_bound` is NOT emitted by this endpoint — that status is derived on the
   * Kibana side by joining the channels list against the bindings list.
   */
  status: 'bound_to_self' | 'bound_to_other_target';
}

/**
 * A single entry from the Relay channels list (`GET /v1/slack/tenants/:tenantKey/channels`).
 * Returns all Slack channels the bot is currently a member of (no binding data).
 */
export interface RelaySlackChannel {
  id: string;
  name: string;
}

export interface RelayClientContract {
  startInstall(body: RelayInstallRequest): Promise<RelayInstallResponse>;
  fetchClaim(claimId: string): Promise<RelayClaimResponse>;
  /** Unbind a single workspace binding identified by its tenant key. */
  unbind(tenantKey: string): Promise<void>;
  /**
   * List the SUB (channel-scoped) bindings for a given Slack workspace (tenant), across all
   * deployments, with caller-relative status (`bound_to_self` or `bound_to_other_target`).
   * Walks every page of the cursor-paginated endpoint. `not_bound` entries are NOT in this
   * list — derive them by joining against `listChannels`.
   */
  listBindings(tenantKey: string): Promise<RelayBinding[]>;
  /**
   * List all Slack channels the bot is currently a member of for a given tenant.
   * Use alongside `listBindings` to derive channels available to bind (`not_bound`).
   */
  listChannels(tenantKey: string): Promise<RelaySlackChannel[]>;
  /** Claim an unclaimed channel for this deployment (put-if-absent; 409 if already claimed). */
  bind(tenantKey: string, channelId: string): Promise<void>;
  /** Release a channel binding owned by this deployment (404 if none; 403 if owned by another). */
  unbindChannel(tenantKey: string, channelId: string): Promise<void>;
  isRelayOrigin(url: string): boolean;
  postCallback(url: string, body: unknown, signal: AbortSignal): Promise<RelayCallbackResponse>;
}
