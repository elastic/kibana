/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, SamlAuth } from '@kbn/scout';

import { COMMON_UNSAFE_HEADERS } from '.';

const CLIENTS_BASE = 'internal/security/oauth/clients';

export type OAuthClientType = 'public' | 'confidential';

export interface SeededOAuthClient {
  id: string;
  clientName: string;
  clientType: OAuthClientType;
  clientSecret?: string;
}

/**
 * Return the internal-request headers (unsafe headers + session cookie) needed to
 * authenticate against the internal OAuth routes as the interactive admin user.
 */
export async function createUiamAuthHeaders(samlAuth: SamlAuth): Promise<Record<string, string>> {
  const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
  return { ...COMMON_UNSAFE_HEADERS, ...cookieHeader };
}

/**
 * Generate a unique, timestamped client name for parallel-safe seeding.
 */
export const uniqueClientName = (prefix = 'scout-app-connections'): string =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

/**
 * Create an OAuth client via the internal Kibana proxy route.
 */
export async function createOAuthClient(
  apiClient: ApiClientFixture,
  authHeaders: Record<string, string>,
  options: {
    clientName?: string;
    clientType?: OAuthClientType;
    redirectUris?: string[];
  } = {}
): Promise<SeededOAuthClient> {
  const clientName = options.clientName ?? uniqueClientName();
  const clientType = options.clientType ?? 'public';

  const response = await apiClient.post(CLIENTS_BASE, {
    headers: authHeaders,
    responseType: 'json',
    body: {
      client_name: clientName,
      client_type: clientType,
      client_metadata: { owner: 'scout' },
      redirect_uris: options.redirectUris ?? ['https://example.com/callback'],
    },
  });

  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to create OAuth client (HTTP ${response.statusCode}): ${JSON.stringify(
        response.body
      )}`
    );
  }

  const created = response.body;
  return {
    id: created.id,
    clientName,
    clientType,
    clientSecret: created.client_secret,
  };
}

/**
 * Revoke an OAuth client via the internal Kibana proxy route.
 */
export async function revokeOAuthClient(
  apiClient: ApiClientFixture,
  authHeaders: Record<string, string>,
  clientId: string
): Promise<void> {
  await apiClient.post(`${CLIENTS_BASE}/${encodeURIComponent(clientId)}/_revoke`, {
    headers: authHeaders,
    responseType: 'json',
    body: { reason: 'scout cleanup' },
  });
}
