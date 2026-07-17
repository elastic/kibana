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

export type RelayClaimResponse = { status: 'pending' } | { status: 'complete'; tenant_key: string };

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
  unbind(): Promise<void>;
}
