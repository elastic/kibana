/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiClientFixture, SamlAuth, ScoutLogger } from '@kbn/scout';
import type { AuthHeadersProvider } from '../../services';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
};

interface ApiKey {
  id: string;
  name: string;
  encoded: string;
}

export interface AdminApiKey {
  getHeaders: AuthHeadersProvider;
  invalidate: () => Promise<void>;
}

/**
 * Lazily creates one admin API key per worker. UI tests have no `requestAuth`
 * fixture, so this mirrors how it mints keys from the admin SAML session.
 */
export const createAdminApiKey = ({
  samlAuth,
  apiClient,
  log,
  name,
}: {
  samlAuth: SamlAuth;
  apiClient: ApiClientFixture;
  log: ScoutLogger;
  name: string;
}): AdminApiKey => {
  let apiKey: Promise<ApiKey> | undefined;

  const create = async (): Promise<ApiKey> => {
    const adminCookieHeader = await samlAuth.session.getApiCredentialsForRole('admin');
    const response = await apiClient.post('internal/security/api_key', {
      headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
      body: { name, metadata: {}, role_descriptors: {} },
      responseType: 'json',
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to create admin API key: ${response.statusMessage}`);
    }

    log.debug(`Created admin API key ${name}`);
    return response.body as ApiKey;
  };

  return {
    getHeaders: async () => {
      apiKey ??= create();
      const { encoded } = await apiKey;
      return { Authorization: `ApiKey ${encoded}` };
    },

    invalidate: async () => {
      const created = await apiKey?.catch(() => undefined);
      if (!created) return;

      const { id } = created;
      const adminCookieHeader = await samlAuth.session.getApiCredentialsForRole('admin');
      const response = await apiClient.post('internal/security/api_key/invalidate', {
        headers: { ...INTERNAL_HEADERS, ...adminCookieHeader },
        body: { apiKeys: [{ id, name }], isAdmin: true },
        responseType: 'json',
      });

      if (response.statusCode !== 200) {
        log.info(`Failed to invalidate admin API key ${name}`);
      }
    },
  };
};
