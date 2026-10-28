/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';

import { apiTest } from '../fixtures';
import type { RecoveryResult } from '../helpers/recovery';
import { expectRecovery, repeatedExpiryTimeout } from '../helpers/recovery';

apiTest.describe(
  'Repeated session credential expiry (ES grant)',
  { tag: ['@local-stateful-classic', '@local-serverless-search'] },
  () => {
    for (const scenario of ['twice', 'stale_first_after_second_expiry'] as const) {
      apiTest(
        `${scenario}: renews the session twice`,
        async ({ apiClient, sessionCredentials }) => {
          apiTest.setTimeout(repeatedExpiryTimeout);

          const headers = await sessionCredentials.makeSession();
          const user = await apiClient.get('internal/security/me', {
            headers,
            responseType: 'json',
          });
          expect(user).toHaveStatusCode(200);

          const response = await apiClient.post<RecoveryResult>(
            'internal/test_endpoints/authentication/credential_recovery',
            {
              headers,
              responseType: 'json',
              body: {
                scenario,
                backend: 'es',
                waitMs: sessionCredentials.waitMs,
                secondWaitMs: sessionCredentials.secondWaitMs,
              },
            }
          );
          expectRecovery(response, { keys: 2, identities: 5, username: user.body.username });
        }
      );
    }
  }
);
