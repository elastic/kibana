/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OAuthClient, OAuthClientLogo, OAuthClientType } from '@kbn/agent-builder-common';

export interface ListOAuthClientsResponse {
  clients: OAuthClient[];
}

export interface CreateOAuthClientPayload {
  client_name: string;
  client_type?: OAuthClientType;
  client_metadata?: Record<string, string>;
  client_logo?: OAuthClientLogo;
  redirect_uris?: string[];
}

export interface CreateOAuthClientResponse extends OAuthClient {
  client_secret?: string;
}

export type GetOAuthClientResponse = OAuthClient;

export interface RevokeOAuthClientPayload {
  reason?: string;
}

export interface RevokeOAuthClientResponse {
  acknowledged: boolean;
}
