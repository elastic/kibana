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

export const getCurrentUsername = async (page: ScoutPage, kbnUrl: KibanaUrl): Promise<string> => {
  const response = await page.request.get(kbnUrl.get('internal/security/me'), {
    headers: INTERNAL_HEADERS,
  });

  if (!response.ok()) {
    throw new Error(`Failed to resolve the current user: ${response.status()}`);
  }

  return (await response.json()).username;
};

export const resolveApiKeyOwner = async (esClient: EsClient, name: string): Promise<string> => {
  const { api_keys: apiKeys } = await esClient.security.queryApiKeys({
    query: { term: { name } },
  });

  if (apiKeys.length === 0) {
    throw new Error(`API key "${name}" is not queryable; cannot resolve its owner`);
  }

  return apiKeys[0].username;
};

const invalidate = async (esClient: EsClient, ids: string[]) => {
  if (ids.length > 0) {
    await esClient.security.invalidateApiKey({ ids });
  }
};

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
