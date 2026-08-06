/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, KibanaUrl, ScoutPage } from '@kbn/scout';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
} as const;

export interface CreateApiKeyRequest {
  name: string;
  expiration?: string;
  role_descriptors?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CreatedApiKey {
  id: string;
  name: string;
}

/**
 * Creates an API key owned by the user the browser is currently logged in as, by reusing the
 * browser session cookie. `esClient` cannot be used for this — it authenticates as the
 * Elasticsearch superuser, so the resulting key would belong to someone else and the UI would
 * render its flyout read-only.
 */
export const createApiKeyAsCurrentUser = async (
  page: ScoutPage,
  kbnUrl: KibanaUrl,
  body: CreateApiKeyRequest
): Promise<CreatedApiKey> => {
  const response = await page.request.post(kbnUrl.get('internal/security/api_key'), {
    headers: INTERNAL_HEADERS,
    data: { role_descriptors: {}, ...body },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create API key "${body.name}": ${response.status()} ${await response.text()}`
    );
  }

  return response.json();
};

/** Username of the user the browser is currently logged in as. */
export const getCurrentUsername = async (page: ScoutPage, kbnUrl: KibanaUrl): Promise<string> => {
  const response = await page.request.get(kbnUrl.get('internal/security/me'), {
    headers: INTERNAL_HEADERS,
  });

  if (!response.ok()) {
    throw new Error(`Failed to resolve the current user: ${response.status()}`);
  }

  return (await response.json()).username;
};

const invalidate = async (esClient: EsClient, ids: string[]) => {
  if (ids.length > 0) {
    await esClient.security.invalidateApiKey({ ids });
  }
};

/**
 * Invalidates only the keys owned by `username`.
 *
 * Deliberately narrower than the FTR helper this replaces, which invalidated every key in the
 * cluster: Scout suites share a deployment, so a blanket invalidation would take out keys that
 * Scout's own auth, Fleet, and alerting depend on.
 */
export const invalidateApiKeysOwnedBy = async (esClient: EsClient, username: string) => {
  const { api_keys: apiKeys } = await esClient.security.queryApiKeys({
    query: { term: { username } },
    size: 1000,
  });

  await invalidate(
    esClient,
    apiKeys.filter((apiKey) => !apiKey.invalidated).map((apiKey) => apiKey.id)
  );
};

/** Invalidates only the named keys, leaving the rest of the deployment's keys untouched. */
export const invalidateApiKeysByName = async (esClient: EsClient, names: string[]) => {
  const { api_keys: apiKeys } = await esClient.security.queryApiKeys({
    query: { terms: { name: names } },
    size: 1000,
  });

  await invalidate(
    esClient,
    apiKeys.filter((apiKey) => !apiKey.invalidated).map((apiKey) => apiKey.id)
  );
};
