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

export type RelayClaimResponse = { status: 'pending' } | { status: 'complete'; tenant_key: string };

export interface RelayCallbackResponse {
  status: number;
}

export interface RelayClientContract {
  startInstall(body: RelayInstallRequest): Promise<RelayInstallResponse>;
  fetchClaim(claimId: string): Promise<RelayClaimResponse>;
  unbind(): Promise<void>;
  isRelayOrigin(url: string): boolean;
  postCallback(url: string, body: unknown, signal: AbortSignal): Promise<RelayCallbackResponse>;
}
