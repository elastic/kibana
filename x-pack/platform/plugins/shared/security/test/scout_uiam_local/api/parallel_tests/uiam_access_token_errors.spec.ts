/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { errors } from '@elastic/elasticsearch';
import { setTimeout as setTimeoutAsync } from 'timers/promises';

import {
  createUiamSessionTokens,
  MOCK_IDP_UIAM_PROJECT_ID,
  MOCK_IDP_UIAM_SHARED_SECRET,
} from '@kbn/mock-idp-utils';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';

apiTest.describe('UIAM access token errors', { tag: tags.serverless.security.complete }, () => {
  let sessionTokensFactory: (params?: {
    lifetime: { accessToken: number };
  }) => Promise<{ accessToken: string }>;
  apiTest.beforeAll(async ({ config: { organizationId, projectType } }) => {
    sessionTokensFactory = async (params) => {
      return await createUiamSessionTokens({
        username: '1234567890',
        organizationId: organizationId!,
        projectType: projectType!,
        roles: ['admin'],
        email: 'elastic_admin@elastic.co',
        accessTokenLifetimeSec: params?.lifetime.accessToken,
      });
    };
  });

  apiTest('expired token error should include appropriate `reason`', async ({ esClient, log }) => {
    const shortLivedTokens = await sessionTokensFactory({ lifetime: { accessToken: 2 } });

    log.info('Waiting for the UIAM session to expire (+5s)…');
    await setTimeoutAsync(5000);
    log.info('Session expiration wait time is over, making the request again.');

    let authenticationError: errors.ResponseError | undefined;
    try {
      await esClient.security.authenticate(undefined, {
        headers: {
          authorization: `Bearer ${shortLivedTokens.accessToken}`,
          [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_UIAM_SHARED_SECRET,
        },
      });
    } catch (err) {
      authenticationError = err;
    }

    expect(authenticationError?.statusCode).toBe(401);
    expect(authenticationError?.body?.error).toMatchObject(
      expect.objectContaining({
        type: 'security_exception',
        reason: `failed to authenticate cloud access token for project [${MOCK_IDP_UIAM_PROJECT_ID}]`,
        caused_by: expect.objectContaining({ authentication_error_code: '0x7E0116' }),
      })
    );
  });

  apiTest('invalid token error should include appropriate `reason`', async ({ esClient }) => {
    const tokens = await sessionTokensFactory();

    let authenticationError: errors.ResponseError | undefined;
    try {
      await esClient.security.authenticate(undefined, {
        headers: {
          // Let's remove the last character from the token to make it invalid.
          authorization: `Bearer ${tokens.accessToken.slice(0, -1)}`,
          [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_UIAM_SHARED_SECRET,
        },
      });
    } catch (err) {
      authenticationError = err;
    }

    expect(authenticationError?.statusCode).toBe(401);
    expect(authenticationError?.body?.error).toMatchObject(
      expect.objectContaining({
        type: 'security_exception',
        reason: `failed to authenticate cloud access token for project [${MOCK_IDP_UIAM_PROJECT_ID}]`,
        caused_by: expect.objectContaining({ authentication_error_code: '0xD00DF3' }),
      })
    );
  });
});
