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
// the session is never at risk and this spec would exercise none of the interesting path.
//
// KibanaSocket resolves the session-level TLSSocket (see `resolveRawSocket`), which outlives the
// destruction of any single HTTP/2 stream. So this spec locks the root-cause fix: an RST arriving
// mid-authenticate must leave the socket readable, and the session intact. The pki.ts
// degraded-socket guard still covers the residual cases (HTTP/1.1 closed sockets, streams already
// destroyed before the request was constructed) and keeps its own unit coverage in pki.test.ts.
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
          aborted: boolean;
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

      await apiTest.step('RST the victim stream while the hold is parked', async () => {
        victim.stream.close(http2.constants.NGHTTP2_CANCEL);

        // `aborted` proves the RST actually reached the server; `continuedAfterHold === false`
        // pins it to the window where the hold is still parked inside PKI authenticate. Without
        // both, this step would pass even if the RST never landed at all.
        await expect
          .poll(async () => {
            const hold = await getHoldStatus();
            return hold.aborted === true && hold.continuedAfterHold === false;
          })
          .toBe(true);

        // The client certificate belongs to the TLS connection, not to the cancelled stream, so
        // destroying one stream must leave the socket fully readable. This is the regression that
        // invalidated PKI sessions under HTTP/2.
        const afterRst = await getHoldStatus();
        expect(afterRst.authorized).toBe(true);
        expect(afterRst.peerCertificateNull).toBe(false);
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
