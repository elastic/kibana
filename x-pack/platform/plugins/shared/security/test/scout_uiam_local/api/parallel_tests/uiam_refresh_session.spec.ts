/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { parse as parseCookie } from 'tough-cookie';

import { createSAMLResponse } from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { COMMON_HEADERS } from '../fixtures';

// These tests cannot be run on MKI because we cannot control the UIAM session lifetime to reduce it (it's 1h by default).
apiTest.describe(
  '[NON-MKI] Refresh UIAM session',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let userSessionCookieFactory: (params: {
      lifetime: { accessToken: number; refreshToken?: number };
    }) => Promise<string>;
    apiTest.beforeAll(async ({ apiClient, kbnUrl, config: { organizationId, projectType } }) => {
      userSessionCookieFactory = async ({ lifetime: { accessToken, refreshToken } }) =>
        parseCookie(
          (
            await apiClient.post('api/security/saml/callback', {
              body: `SAMLResponse=${encodeURIComponent(
                await createSAMLResponse({
                  kibanaUrl: kbnUrl.get('/api/security/saml/callback'),
                  username: '1234567890',
                  email: 'elastic_viewer@elastic.co',
                  roles: ['viewer'],
                  serverless: {
                    uiamEnabled: true,
                    organizationId: organizationId!,
                    projectType: projectType!,
                    accessTokenLifetimeSec: accessToken,
                    refreshTokenLifetimeSec: refreshToken,
                  },
                })
              )}`,
            })
          ).headers['set-cookie'][0]
        )!.cookieString();
    });

    apiTest(
      'should be able to authenticate as UIAM user even if the access token has expired',
      async ({ apiClient, log }) => {
        const userSessionCookie = await userSessionCookieFactory({ lifetime: { accessToken: 2 } });
        let response = await apiClient.get('internal/security/me', {
          headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));

        log.info('Waiting for the UIAM session to expire (+5s)…');
        await setTimeoutAsync(5000);
        log.info('Session expiration wait time is over, making the request again.');

        response = await apiClient.get('internal/security/me', {
          headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));
      }
    );

    apiTest(
      'should be able to authenticate as UIAM user when the tokens are refreshed concurrently',
      async ({ apiClient, log }) => {
        const userSessionCookie = await userSessionCookieFactory({ lifetime: { accessToken: 2 } });
        const response = await apiClient.get('internal/security/me', {
          headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));

        log.info('Waiting for the UIAM session to expire (+5s)…');
        await setTimeoutAsync(5000);
        log.info('Session expiration wait time is over, making the request again.');

        const responses = await Promise.all(
          Array.from({ length: 10 }, () =>
            apiClient.get('internal/security/me', {
              headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
              responseType: 'json',
            })
          )
        );
        for (const res of responses) {
          expect(res).toHaveStatusCode(200);
          expect(res.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));
        }
      }
    );

    apiTest(
      'should fail if both access and refresh tokens have expired',
      async ({ apiClient, log }) => {
        const userSessionCookie = await userSessionCookieFactory({
          lifetime: { accessToken: 2, refreshToken: 2 },
        });
        let response = await apiClient.get('internal/security/me', {
          headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));

        log.info('Waiting for the UIAM session to expire (+5s)…');
        await setTimeoutAsync(5000);
        log.info('Session expiration wait time is over, making the request again.');

        response = await apiClient.get('internal/security/me', {
          headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(401);
      }
    );
  }
);
