/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';

import { apiTest } from '../fixtures';
import type { RecoveryResult } from '../helpers/recovery';
import { singleExpiryTimeout } from '../helpers/recovery';

apiTest.describe(
  'External credentials with a session cookie (ES grant)',
  { tag: ['@local-stateful-classic', '@local-serverless-search'] },
  () => {
    for (const operation of ['grants', 'scoped'] as const) {
      apiTest(
        `an expired external bearer never falls back to the accompanying session cookie (${operation})`,
        async ({ apiClient, sessionCredentials }) => {
          apiTest.setTimeout(singleExpiryTimeout);

          const headers = await sessionCredentials.makeSession(3600);
          const cookieUser = await apiClient.get('internal/security/me', {
            headers,
            responseType: 'json',
          });
          expect(cookieUser).toHaveStatusCode(200);

          const token = await sessionCredentials.issueExternalBearer();
          const response = await apiClient.post<RecoveryResult>(
            'internal/test_endpoints/authentication/credential_recovery',
            {
              headers: {
                ...headers,
                ...sessionCredentials.clientAuthHeaders,
                Authorization: `Bearer ${token}`,
              },
              body: { scenario: operation, backend: 'es', waitMs: sessionCredentials.waitMs },
              responseType: 'json',
            }
          );
          expect(response).toHaveStatusCode(500);
          expect(response.body.keys).toStrictEqual([]);
          expect(response.body.headersUnchanged).toBe(true);
          expect(response.body.snapshotExpired).toBe(true);
          expect(response.body.cleanupComplete).toBe(true);

          const after = await apiClient.get('internal/security/me', {
            headers,
            responseType: 'json',
          });
          expect(after).toHaveStatusCode(200);
          expect(after.body.username).toBe(cookieUser.body.username);
        }
      );
    }
  }
);
