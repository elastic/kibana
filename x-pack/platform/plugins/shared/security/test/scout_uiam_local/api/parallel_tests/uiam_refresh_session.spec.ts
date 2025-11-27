/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { parse as parseCookie } from 'tough-cookie';

import { createSAMLResponse } from '@kbn/mock-idp-utils';
import { apiTest, expect } from '@kbn/scout';

import { COMMON_HEADERS } from '../fixtures/constants';

apiTest.describe('[LOCAL-ONLY] Refresh UIAM session', { tag: ['@svlSecurity'] }, () => {
  let userSessionCookie: string;
  apiTest.beforeAll(async ({ apiClient, kbnUrl, config: { organizationId, projectType } }) => {
    // Create a custom SAML response with a short-lived access token (2 seconds).
    userSessionCookie = parseCookie(
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
                accessTokenLifetimeSec: 2,
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
      let response = await apiClient.get('internal/security/me', {
        headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
        responseType: 'json',
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));

      log.info('Waiting for the UIAM session to expire (+5s)…');
      await setTimeoutAsync(5000);
      log.info('Session expiration wait time is over, making the request again.');

      response = await apiClient.get('internal/security/me', {
        headers: { ...COMMON_HEADERS, Cookie: userSessionCookie },
        responseType: 'json',
      });
      expect(response.statusCode).toBe(200);
      expect(response.body).toStrictEqual(expect.objectContaining({ username: '1234567890' }));
    }
  );
});
