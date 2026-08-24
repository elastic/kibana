/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import http2 from 'http2';

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { apiTest, testData } from '../fixtures';

const PREAUTH_HOLD_HEADER = 'x-elastic-preauth-hold';

// Parks inside PKI authenticate (not onPreAuth). RST during onPreAuth makes Hapi skip Auth, so
// the session is never at risk and this spec would pass even without the pki.ts guard.
apiTest.describe('PKI HTTP/2 stream cancel', { tag: tags.stateful.classic }, () => {
  apiTest.beforeAll(async ({ esClient }) => {
    await esClient.security.putRoleMapping({
      name: 'first_client_pki',
      enabled: true,
      roles: ['kibana_admin'],
      rules: { field: { dn: 'CN=first_client' } },
    });
  });

  apiTest.afterAll(async ({ esClient }) => {
    await esClient.security.deleteRoleMapping({ name: 'first_client_pki' }, { ignore: [404] });
  });

  apiTest(
    'cancelling one stream during PKI auth does not revoke the session',
    async ({ apiClient, pkiHttp2 }) => {
      const holdId = randomUUID();

      const sidCookie = await apiTest.step('login', async () => {
        const login = pkiHttp2.request({ path: '/security/account' });
        const loginResponse = await login.response;
        expect(loginResponse.statusCode).toBe(200);
        return pkiHttp2.sidCookieString(loginResponse.headers);
      });

      const getHoldStatus = async () => {
        const status = await apiClient.get(`authentication/preauth_holds/${holdId}`, {
          headers: testData.COMMON_HEADERS,
          responseType: 'json',
        });
        return status.body as {
          parked: boolean;
          continuedAfterHold: boolean;
          authCompleted: boolean;
          authorized: boolean | null;
          peerCertificateNull: boolean;
        };
      };

      const victim = pkiHttp2.request({
        path: '/internal/security/me',
        headers: {
          ...testData.COMMON_HEADERS,
          cookie: sidCookie,
          [PREAUTH_HOLD_HEADER]: holdId,
        },
      });

      await apiTest.step('park inside PKI authenticate', async () => {
        await expect.poll(async () => (await getHoldStatus()).parked).toBe(true);
        const parked = await getHoldStatus();
        expect(parked.authorized).toBe(true);
        expect(parked.peerCertificateNull).toBe(false);
      });

      await apiTest.step('RST until the parked socket is degraded', async () => {
        victim.stream.close(http2.constants.NGHTTP2_CANCEL);
        // Requiring `continuedAfterHold === false` pins the degradation to the RST arriving
        // while the hold is still parked. Without it, a hold that times out degrades the
        // socket the same way once the request completes normally, and this step would pass
        // without exercising the destroyed-socket-during-auth path.
        await expect
          .poll(async () => {
            const hold = await getHoldStatus();
            return (
              hold.continuedAfterHold === false &&
              hold.peerCertificateNull === true &&
              hold.authorized !== true
            );
          })
          .toBe(true);
      });

      await apiTest.step('release', async () => {
        const releaseResponse = await apiClient.post(
          `authentication/preauth_holds/${holdId}/release`,
          {
            headers: testData.COMMON_HEADERS,
            responseType: 'json',
          }
        );
        expect(releaseResponse).toHaveStatusCode(200);

        await expect.poll(async () => (await getHoldStatus()).continuedAfterHold).toBe(true);
        // Wait until authenticateViaState has finished invalidating (or preserving) the session.
        // continuedAfterHold is set before that work runs; following up too early races a 200.
        await expect.poll(async () => (await getHoldStatus()).authCompleted).toBe(true);
      });

      await apiTest.step('follow-up', async () => {
        const followUp = pkiHttp2.request({
          path: '/internal/security/me',
          headers: {
            ...testData.COMMON_HEADERS,
            cookie: sidCookie,
          },
        });
        const followUpResponse = await followUp.response;
        expect(followUpResponse.statusCode).toBe(200);
        expect(JSON.parse(followUpResponse.body)).toMatchObject({
          username: 'first_client',
          authentication_provider: { type: 'pki', name: 'pki1' },
        });
      });
    }
  );
});
