/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import { apiTest as baseApiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { deleteUiamServiceAccount } from './uiam_service_account_cleanup';

export const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' } as const;

/**
 * Headers for managing UIAM service accounts. UIAM refuses to create them for session users, so
 * they carry the seeded organization key instead. The key exists only after an interactive login.
 */
export const ORG_ADMIN_HEADERS = {
  ...HEADERS,
  Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
} as const;

/**
 * Long enough to outlive a UIAM exchange token. The config set issues one-minute tokens, and UIAM
 * allows 2s of clock skew. Tests that wait this long raise their own timeout above Scout's 60s
 * default, to {@link OUTLIVE_UIAM_TOKEN_TEST_TIMEOUT_MS}.
 */
export const OUTLIVE_UIAM_TOKEN_MS = 65_000;
export const OUTLIVE_UIAM_TOKEN_TEST_TIMEOUT_MS = 180_000;

export const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';

/** The security plugin's route for one service account. */
export const serviceAccountPath = (id: string) =>
  `${SERVICE_ACCOUNT_ENDPOINT}/${encodeURIComponent(id)}`;

/** A UIAM service account as Kibana reports it right after creating it. */
export interface CreatedUiamServiceAccount {
  id: string;
  name: string;
  roles: string[];
  description?: string;
}

export interface UiamServiceAccountsFixture {
  /**
   * Creates a UIAM service account through Kibana, as the seeded organization key. The worker
   * deletes every account it created when it shuts down.
   */
  create: (params: {
    name: string;
    roles: readonly string[];
    description?: string;
  }) => Promise<CreatedUiamServiceAccount>;
}

export const apiTest = baseApiTest.extend<{}, { uiamServiceAccounts: UiamServiceAccountsFixture }>({
  uiamServiceAccounts: [
    async ({ apiClient, samlAuth }, use) => {
      const created: string[] = [];
      let seeded = false;

      const create: UiamServiceAccountsFixture['create'] = async (body) => {
        if (!seeded) {
          // Interactive login seeds the local UIAM organization key.
          await samlAuth.asInteractiveUser('admin');
          seeded = true;
        }
        const response = await apiClient.post<CreatedUiamServiceAccount>(SERVICE_ACCOUNT_ENDPOINT, {
          headers: ORG_ADMIN_HEADERS,
          body,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        created.push(response.body.id);
        return response.body;
      };

      await use({ create });

      // Forced, because a test that leaves a workload bound has already failed for that reason.
      // An account a test deleted itself answers 200 while UIAM still holds the record, and 404
      // once it doesn't. Anything else falls back to removing the record from the emulator, so
      // one bad delete doesn't leak the account.
      const failures: Error[] = [];
      for (const id of created) {
        try {
          const deleted = await apiClient.delete(`${serviceAccountPath(id)}?force=true`, {
            headers: ORG_ADMIN_HEADERS,
            responseType: 'json',
          });
          if (deleted.statusCode !== 200 && deleted.statusCode !== 404) {
            await deleteUiamServiceAccount(id);
          }
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error(`Failed to delete service account [${id}].`)
          );
        }
      }
      if (failures.length) {
        throw new AggregateError(failures, 'UIAM service account cleanup failed.');
      }
    },
    { scope: 'worker' },
  ],
});
