/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';

import { apiTest } from '../fixtures';
import type { RecoveryResult } from '../helpers/recovery';
import { expectRecovery, recoveryScenarios, singleExpiryTimeout } from '../helpers/recovery';

apiTest.describe(
  'Session credential recovery (UIAM grant)',
  { tag: ['@local-serverless-search'] },
  () => {
    for (const scenario of recoveryScenarios) {
      apiTest(
        `${scenario.scenario}: preserves identity and shared headers across expiry`,
        async ({ apiClient, sessionCredentials }) => {
          apiTest.setTimeout(singleExpiryTimeout);

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
                scenario: scenario.scenario,
                backend: 'uiam',
                waitMs: sessionCredentials.waitMs,
              },
            }
          );
          expectRecovery(response, { ...scenario, username: user.body.username });
        }
      );
    }

    apiTest(
      'concurrent incoming requests can refresh the same session independently',
      async ({ apiClient, sessionCredentials }) => {
        apiTest.setTimeout(singleExpiryTimeout);

        const headers = await sessionCredentials.makeSession();
        const user = await apiClient.get('internal/security/me', { headers, responseType: 'json' });
        expect(user).toHaveStatusCode(200);

        const responses = await Promise.all(
          Array.from({ length: 3 }, () =>
            apiClient.post<RecoveryResult>(
              'internal/test_endpoints/authentication/credential_recovery',
              {
                headers,
                body: { scenario: 'mixed', backend: 'uiam', waitMs: sessionCredentials.waitMs },
                responseType: 'json',
              }
            )
          )
        );
        for (const response of responses) {
          expectRecovery(response, { keys: 2, identities: 4, username: user.body.username });
        }
      }
    );
  }
);
