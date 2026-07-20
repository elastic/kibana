/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LicenseType } from '@kbn/licensing-types';

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
  /** The public URL of the connecting Kibana deployment. */
  kibana_url: string;
  /** The Kibana version of the connecting deployment, e.g. `9.2.0`. */
  kibana_version: string;
  /** Deployment license type, used by the Relay to gate tenant features. */
  license_info: LicenseType;
  /** Optional audit marker for who initiated the install. */
  created_by_user_key?: string;
}

export interface RelayInstallResponse {
  authorize_url: string;
  claim_id: string;
}

export type RelayClaimResponse =
  | { status: 'pending' }
  | { status: 'complete'; tenant_key: string | undefined };

/** A single entry from the Relay bindings list (`GET /v1/slack/tenants/:tenantKey/bindings`). */
export interface RelayBinding {
  /** Binding scope type from the Relay: `"DEFAULT"` for workspace-wide or `"SUB"` for channel-specific. */
  scope_type?: string;
  /** Channel id — present for `SUB`-scope entries. */
  scope_id?: string;
  /** Human-readable channel name — present when the Relay's channel enrichment is wired in. */
  displayName?: string;
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
export interface RelayChannel {
  id: string;
  name: string;
}

/**
 * The subset of the Relay client that streams-core depends on structurally, via
 * the shared `StreamsServer.relayClient` field.
 *
 * This contract lives in the schema package so streams-core can depend on it
 * type-only, without importing the concrete `RelayClient` implementation, which
 * lives in the significant_events plugin — keeping the dependency one-way. The
 * concrete client is structurally assignable to this contract.
 */
export interface RelayClientContract {
  startInstall(body: RelayInstallRequest): Promise<RelayInstallResponse>;
  fetchClaim(claimId: string): Promise<RelayClaimResponse>;
  /** Unbind a single workspace binding identified by its tenant key. */
  unbind(tenantKey: string): Promise<void>;
  /**
   * List the bindings for a given Slack workspace (tenant), as seen from this deployment's
   * perspective. Filters to DEFAULT + SUB scopes; status is caller-relative (`bound_to_self`
   * or `bound_to_other_target`). `not_bound` entries are NOT in this list — derive them by
   * joining against `listChannels`.
   */
  listBindings(tenantKey: string): Promise<RelayBinding[]>;
  /**
   * List all Slack channels the bot is currently a member of for a given tenant.
   * Use alongside `listBindings` to derive channels available to bind (`not_bound`).
   */
  listChannels(tenantKey: string): Promise<RelayChannel[]>;
  /** Claim an unclaimed channel for this deployment (put-if-absent; 409 if already claimed). */
  bind(tenantKey: string, channelId: string): Promise<void>;
  /** Release a channel binding owned by this deployment (404 if none; 403 if owned by another). */
  unbindChannel(tenantKey: string, channelId: string): Promise<void>;
}
