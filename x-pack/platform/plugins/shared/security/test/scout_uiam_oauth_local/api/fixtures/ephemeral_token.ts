/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent, fetch } from 'undici';

import { createUiamOAuthAccessToken, MOCK_IDP_UIAM_SERVICE_URL } from '@kbn/mock-idp-utils';
import { apiTest as baseApiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

export const TEST_USERNAME = '1234567891';

export const apiTest = baseApiTest.extend<{ ephemeralToken: string }, { oauthAccessToken: string }>(
  {
    oauthAccessToken: [
      async ({ kbnUrl, config: { organizationId, projectType } }, use) => {
        if (!organizationId || !projectType) {
          throw new Error(
            'UIAM client authentication tests require a local Serverless deployment.'
          );
        }
        await use(
          await createUiamOAuthAccessToken({
            username: TEST_USERNAME,
            email: 'scout-client-authentication@elastic.co',
            organizationId,
            projectType,
            roles: ['admin'],
            audience: new URL(kbnUrl.get()).origin,
          })
        );
      },
      { scope: 'worker' },
    ],
    ephemeralToken: async ({ oauthAccessToken, kbnUrl }, use) => {
      const url = new URL('/uiam/api/v1/authentication/_authenticate', MOCK_IDP_UIAM_SERVICE_URL);
      url.searchParams.set('include_token', 'true');
      url.searchParams.set('audience', new URL(kbnUrl.get()).origin);
      const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
      let token: string;
      try {
        // Act as the gateway: exchange OAuth directly with UIAM before calling Kibana.
        const response = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${oauthAccessToken}`, 'User-Agent': 'Kibana-Scout' },
          dispatcher,
          signal: AbortSignal.timeout(30_000),
        });
        expect(response.status).toBe(200);
        const body = (await response.json()) as { token: string };
        expect(body.token).toMatch(/^essu_/);
        token = body.token;
      } finally {
        await dispatcher.close();
      }
      await use(token);
    },
  }
);
