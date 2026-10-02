/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { MOCK_IDP_UIAM_ORG_ADMIN_API_KEY } from '@kbn/mock-idp-utils';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import { deleteUiamServiceAccount } from '../fixtures/uiam_service_account_cleanup';

const headers = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
  Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
};

// The local UIAM client certificate identifies an Elasticsearch (Search) project.
apiTest.describe(
  'Create Serverless service accounts',
  { tag: ['@local-serverless-search'] },
  () => {
    let accountId: string | undefined;

    apiTest.beforeAll(async ({ samlAuth }) => {
      // Interactive login seeds the local UIAM organization key used by this suite.
      await samlAuth.asInteractiveUser('admin');
    });

    apiTest.afterEach(async () => {
      if (accountId) {
        await deleteUiamServiceAccount(accountId);
        accountId = undefined;
      }
    });

    apiTest('persists the requested name and roles in UIAM', async ({ apiClient }) => {
      const name = `scout-sa-${randomUUID()}`;
      const created = await apiClient.post('internal/security/service_account', {
        headers,
        body: { name, roles: ['viewer', 'editor'] },
        responseType: 'json',
      });
      accountId = created.body.id;
      expect(created).toHaveStatusCode(200);
      expect(typeof accountId).toBe('string');
      expect(accountId).not.toBe('');
      expect(created.body).toStrictEqual({
        id: accountId,
        name,
        roles: ['viewer', 'editor'],
      });

      const stored = await apiClient.get(
        `internal/security/service_account/${encodeURIComponent(created.body.id)}`,
        { headers, responseType: 'json' }
      );
      expect(stored).toHaveStatusCode(200);
      expect(stored.body).toMatchObject({ id: accountId, name, enabled: true });
      expect([...stored.body.roles].sort()).toStrictEqual(['editor', 'viewer']);
    });

    apiTest('rejects descriptions on Serverless', async ({ apiClient }) => {
      const response = await apiClient.post('internal/security/service_account', {
        headers,
        body: { name: `scout-sa-${randomUUID()}`, roles: ['viewer'], description: 'unsupported' },
        responseType: 'json',
      });
      accountId = response.body.id;
      expect(response).toHaveStatusCode(400);
      expect(response.body.message).toBe(
        'Service account descriptions are not supported on Serverless.'
      );
    });
  }
);
