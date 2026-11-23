/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient, RequestAuthFixture, RoleApiCredentials } from '@kbn/scout';

/** The part of `kbnClient` the API services use to talk to Kibana. */
export type KbnRequester = Pick<KbnClient, 'request'>;

/**
 * Wraps `kbnClient` so every request carries an admin API key. Routes whose handler grants an API
 * key for the caller need it: on serverless that grant goes through UIAM, which rejects kbnClient's
 * basic credentials.
 */
export const withAdminApiKey = (
  kbnClient: KbnRequester,
  requestAuth: RequestAuthFixture
): KbnRequester => {
  // Resolved once per worker: every call to `getApiKeyForAdmin` mints a new key.
  let credentials: Promise<RoleApiCredentials> | undefined;

  return {
    request: async <T>(options: Parameters<KbnClient['request']>[0]) => {
      credentials ??= requestAuth.getApiKeyForAdmin();
      const { apiKeyHeader } = await credentials;

      return kbnClient.request<T>({ ...options, headers: { ...options.headers, ...apiKeyHeader } });
    },
  };
};
