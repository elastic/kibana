/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { MOCK_IDP_GATEWAY_SHARED_SECRET } from '@kbn/mock-idp-utils';
import { expect } from '@kbn/scout/api';

import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../../../common/constants';
import { apiTest, HEADERS } from '../fixtures';
import { exchangeUiamServiceAccountToken } from '../fixtures/uiam_service_account_token';

const PRINCIPAL_PATH = 'internal/service_accounts_test/_principal';

// The local UIAM client certificate identifies an Elasticsearch (Search) project.
apiTest.describe(
  'Classify real requests authenticated with a UIAM service account token',
  { tag: ['@local-serverless-search'] },
  () => {
    let accountId: string;

    apiTest.beforeAll(async ({ uiamServiceAccounts }) => {
      ({ id: accountId } = await uiamServiceAccounts.create({
        name: `sa-uiam-principal-${randomUUID()}`,
        roles: ['viewer'],
      }));
    });

    apiTest('classifies the request as that service account', async ({ apiClient }) => {
      const token = await exchangeUiamServiceAccountToken(accountId);

      const response = await apiClient.get(PRINCIPAL_PATH, {
        headers: {
          ...HEADERS,
          Authorization: `Bearer ${token}`,
          // Elasticsearch only accepts the token alongside the secret the gateway adds in front
          // of a real project.
          [ES_CLIENT_AUTHENTICATION_HEADER]: MOCK_IDP_GATEWAY_SHARED_SECRET,
        },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        principal: {
          type: 'service_account',
          variant: 'uiam',
          serviceAccountId: accountId,
        },
      });
    });
  }
);
