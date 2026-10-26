/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';

import { apiTest } from '../fixtures';
import type { RecoveryResult } from '../helpers/recovery';
import { expectRecovery } from '../helpers/recovery';

const directUiamGrantTimeout = 120_000;

apiTest.describe(
  'Direct session credential recovery (UIAM grant)',
  { tag: ['@local-serverless-search'] },
  () => {
    apiTest(
      'direct UIAM grants recover without an Elasticsearch expiry probe',
      async ({ apiClient, sessionCredentials }) => {
        apiTest.setTimeout(directUiamGrantTimeout);

        const headers = await sessionCredentials.makeSession();
        const user = await apiClient.get('internal/security/me', { headers, responseType: 'json' });
        expect(user).toHaveStatusCode(200);

        const response = await apiClient.post<RecoveryResult>(
          'internal/test_endpoints/authentication/credential_recovery',
          {
            headers,
            responseType: 'json',
            // Outlive the login token and any one-minute token renewed during HTTP auth.
            body: {
              scenario: 'concurrent_grants',
              backend: 'uiam',
              waitMs: 65_000,
              probeFirst: false,
            },
          }
        );
        expectRecovery(response, {
          keys: 3,
          identities: 3,
          username: user.body.username,
          snapshotExpired: false,
        });
      }
    );
  }
);
