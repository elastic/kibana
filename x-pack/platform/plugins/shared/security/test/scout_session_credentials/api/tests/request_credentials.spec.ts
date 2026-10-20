/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';

import {
  createSAMLResponse,
  createUiamSessionTokens,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

interface RecoveryResult {
  keys: Array<{ id: string; backend: 'es' | 'uiam' }>;
  usernames: string[];
  headersUnchanged: boolean;
  snapshotExpired: boolean;
  cleanupComplete: boolean;
}

const repeatedExpiryTimeout = 150_000;
const singleExpiryTimeout = 90_000;
const directUiamGrantTimeout = 120_000;

const scenarios = [
  { scenario: 'grants', keys: 2, identities: 2 },
  { scenario: 'concurrent_grants', keys: 3, identities: 3 },
  { scenario: 'scoped', keys: 0, identities: 3 },
  { scenario: 'mixed', keys: 2, identities: 4 },
  { scenario: 'late', keys: 1, identities: 3 },
  { scenario: 'twice', keys: 2, identities: 5 },
] as const;

for (const backend of ['es', 'uiam'] as const) {
  apiTest.describe(
    `Session credential recovery (${backend} grant)`,
    {
      tag:
        backend === 'es'
          ? ['@local-stateful-classic', '@local-serverless-search']
          : ['@local-serverless-search'],
    },
    () => {
      let makeSession: (lifetime?: number) => Promise<Record<string, string>>;
      let issueExternalBearer: () => Promise<string>;
      let waitMs: number;
      let secondWaitMs: number;
      let clientAuthHeaders: Record<string, string>;

      apiTest.beforeAll(async ({ apiClient, samlAuth, esClient, config }) => {
        waitMs = config.uiam ? 15_000 : 20_000;
        secondWaitMs = config.uiam ? 65_000 : 20_000;
        clientAuthHeaders = config.uiam
          ? { 'x-client-authentication': MOCK_IDP_UIAM_SHARED_SECRET }
          : {};
        makeSession = async (lifetime = 10) => {
          if (!config.uiam) return (await samlAuth.asInteractiveUser('admin')).cookieHeader;
          if (!config.organizationId || !config.projectType)
            throw new Error('UIAM test configuration is missing its organization or project type');
          const saml = await createSAMLResponse({
            username: '1234567890',
            email: 'elastic_admin@elastic.co',
            roles: ['admin'],
            serverless: {
              uiamEnabled: true,
              organizationId: config.organizationId,
              projectType: config.projectType,
              accessTokenLifetimeSec: lifetime,
            },
          });
          const response = await apiClient.post('api/security/saml/callback', {
            body: `SAMLResponse=${encodeURIComponent(saml)}`,
          });
          const cookies = response.headers['set-cookie'];
          const cookie = parseCookie(Array.isArray(cookies) ? cookies[0] : cookies);
          if (!cookie) throw new Error('SAML authentication did not return a session cookie');
          return { Cookie: cookie.cookieString() };
        };
        issueExternalBearer = async () => {
          if (!config.uiam)
            return (
              await esClient.security.getToken({
                grant_type: 'password',
                username: config.auth.username,
                password: config.auth.password,
              })
            ).access_token;
          if (!config.organizationId || !config.projectType)
            throw new Error('UIAM test configuration is incomplete');
          return (
            await createUiamSessionTokens({
              username: '9876543210',
              email: 'elastic_external@elastic.co',
              roles: ['admin'],
              organizationId: config.organizationId,
              projectType: config.projectType,
              accessTokenLifetimeSec: 10,
            })
          ).accessToken;
        };
      });

      for (const scenario of scenarios) {
        apiTest(
          `${scenario.scenario}: preserves identity and shared headers across expiry`,
          async ({ apiClient }) => {
            apiTest.setTimeout(repeatedExpiryTimeout);
            const cookie = await makeSession();
            const headers = {
              ...cookie,
              'kbn-xsrf': 'true',
              'x-elastic-internal-origin': 'kibana',
            };
            const user = await apiClient.get('internal/security/me', {
              headers,
              responseType: 'json',
            });
            expect(user).toHaveStatusCode(200);
            const response = await apiClient.post<RecoveryResult>(
              'internal/service_accounts_test/_credential_recovery',
              {
                headers,
                responseType: 'json',
                body: { scenario: scenario.scenario, backend, waitMs, secondWaitMs },
              }
            );
            expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
            expect(response.body.headersUnchanged).toBe(true);
            expect(response.body.snapshotExpired).toBe(true);
            expect(response.body.cleanupComplete).toBe(true);
            expect(response.body.keys).toHaveLength(scenario.keys);
            expect(new Set(response.body.keys.map((key) => key.id)).size).toBe(scenario.keys);
            expect(response.body.usernames).toStrictEqual(
              Array(scenario.identities).fill(user.body.username)
            );
          }
        );
      }

      apiTest(
        'concurrent incoming requests can refresh the same session independently',
        async ({ apiClient }) => {
          apiTest.setTimeout(singleExpiryTimeout);
          const cookie = await makeSession();
          const headers = { ...cookie, 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
          const user = await apiClient.get('internal/security/me', {
            headers,
            responseType: 'json',
          });
          const responses = await Promise.all(
            Array.from({ length: 3 }, () =>
              apiClient.post<RecoveryResult>(
                'internal/service_accounts_test/_credential_recovery',
                {
                  headers,
                  body: { scenario: 'mixed', backend, waitMs },
                  responseType: 'json',
                }
              )
            )
          );
          for (const response of responses) {
            expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
            expect(response.body.headersUnchanged).toBe(true);
            expect(response.body.snapshotExpired).toBe(true);
            expect(response.body.cleanupComplete).toBe(true);
            expect(response.body.keys).toHaveLength(2);
            expect(response.body.usernames).toStrictEqual(Array(4).fill(user.body.username));
          }
        }
      );

      const nonRenewableScenarios =
        backend === 'es' ? (['grants', 'scoped'] as const) : (['grants'] as const);
      for (const operation of nonRenewableScenarios) {
        apiTest(
          `an expired external bearer never falls back to the accompanying session cookie (${operation})`,
          async ({ apiClient }) => {
            apiTest.setTimeout(singleExpiryTimeout);
            const cookie = await makeSession(3600);
            const headers = { ...cookie, 'x-elastic-internal-origin': 'kibana' };
            const cookieUser = await apiClient.get('internal/security/me', {
              headers,
              responseType: 'json',
            });
            expect(cookieUser).toHaveStatusCode(200);
            const token = await issueExternalBearer();
            const response = await apiClient.post<RecoveryResult>(
              'internal/service_accounts_test/_credential_recovery',
              {
                headers: {
                  ...headers,
                  ...clientAuthHeaders,
                  Authorization: `Bearer ${token}`,
                  'kbn-xsrf': 'true',
                  'x-elastic-internal-origin': 'kibana',
                },
                body: { scenario: operation, backend, waitMs },
                responseType: 'json',
              }
            );
            expect(response).toHaveStatusCode(
              operation === 'grants' && backend === 'uiam' ? 401 : 500
            );
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

      if (backend === 'uiam') {
        apiTest(
          'direct UIAM grants recover without an Elasticsearch expiry probe',
          async ({ apiClient }) => {
            apiTest.setTimeout(directUiamGrantTimeout);
            const cookie = await makeSession();
            const headers = {
              ...cookie,
              'kbn-xsrf': 'true',
              'x-elastic-internal-origin': 'kibana',
            };
            const user = await apiClient.get('internal/security/me', {
              headers,
              responseType: 'json',
            });
            const response = await apiClient.post<RecoveryResult>(
              'internal/service_accounts_test/_credential_recovery',
              {
                headers,
                responseType: 'json',
                // Outlive the login token and any one-minute token renewed during HTTP auth.
                body: { scenario: 'concurrent_grants', backend, waitMs: 65_000, probeFirst: false },
              }
            );
            expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
            expect(response.body.keys).toHaveLength(3);
            expect(response.body.headersUnchanged).toBe(true);
            expect(response.body.snapshotExpired).toBe(false);
            expect(response.body.cleanupComplete).toBe(true);
            expect(response.body.usernames).toStrictEqual(Array(3).fill(user.body.username));
          }
        );
      }
    }
  );
}
