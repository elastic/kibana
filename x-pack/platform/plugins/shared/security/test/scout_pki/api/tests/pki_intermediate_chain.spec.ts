/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { findSessionCookie } from '@kbn/security-api-integration-helpers';

import { apiTest, testData } from '../fixtures';

// Kibana and Elasticsearch trust only the root CA, so Kibana must read the intermediate CA from
// the client's chain and pass it to `/_security/delegate_pki`.
apiTest.describe(
  'PKI authentication with an intermediate client CA',
  { tag: tags.stateful.classic },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.security.putRoleMapping({
        name: 'pki_intermediate_client',
        enabled: true,
        roles: ['kibana_admin'],
        rules: { field: { dn: `CN=${testData.INTERMEDIATE_CLIENT_USERNAME}` } },
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.security.deleteRoleMapping(
        { name: 'pki_intermediate_client' },
        { ignore: [404] }
      );
    });

    apiTest(
      'logs in when the client sends its intermediate CA',
      async ({ connectWithClientCertificate, esClient }) => {
        await apiTest.step('reject the leaf certificate without its intermediate CA', async () => {
          const leafOnly = await connectWithClientCertificate(testData.LEAF_ONLY_CLIENT);
          const response = await leafOnly.request('/security/account');
          expect(response.statusCode).toBe(302);
          expect(response.headers['set-cookie']).toBeUndefined();
        });

        const client = await connectWithClientCertificate(testData.INTERMEDIATE_CLIENT);

        const sidCookie = await apiTest.step('log in with no existing session', async () => {
          const response = await client.request('/security/account');
          expect(response.statusCode).toBe(200);
          return findSessionCookie(response.headers['set-cookie']).cookieString();
        });

        const profileUid = await apiTest.step('use the new session', async () => {
          const response = await client.request('/internal/security/me', {
            ...testData.COMMON_HEADERS,
            cookie: sidCookie,
          });
          expect(response.statusCode).toBe(200);

          const user = JSON.parse(response.body);
          expect(user).toMatchObject({
            username: testData.INTERMEDIATE_CLIENT_USERNAME,
            roles: ['kibana_admin'],
            metadata: { pki_dn: `CN=${testData.INTERMEDIATE_CLIENT_USERNAME}` },
            authentication_realm: { name: 'pki1', type: 'pki' },
            authentication_provider: { type: 'pki', name: 'pki1' },
          });
          return user.profile_uid as string;
        });

        await apiTest.step('activate a user profile with the delegated token', async () => {
          const { profiles } = await esClient.security.getUserProfile({ uid: profileUid });
          expect(profiles).toHaveLength(1);
          expect(profiles[0].user).toMatchObject({
            username: testData.INTERMEDIATE_CLIENT_USERNAME,
            realm_name: 'pki1',
          });
        });
      }
    );
  }
);
