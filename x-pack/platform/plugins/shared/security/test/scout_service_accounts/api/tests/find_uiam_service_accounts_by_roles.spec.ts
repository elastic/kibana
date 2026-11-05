/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import { expect } from '@kbn/scout/api';

import { apiTest, ORG_ADMIN_HEADERS as headers, SERVICE_ACCOUNT_ENDPOINT } from '../fixtures';

const FIND_BY_ROLES_ENDPOINT = `${SERVICE_ACCOUNT_ENDPOINT}/_find_by_roles`;

interface FindResponse {
  serviceAccounts: Array<{
    id: string;
    name: string;
    roles: string[];
    enabled: boolean;
    workloadCount?: number;
  }>;
  complete: boolean;
}

// The local UIAM client certificate identifies an Elasticsearch (Search) project.
apiTest.describe(
  'Find Serverless service accounts by role',
  { tag: ['@local-serverless-search'] },
  () => {
    apiTest(
      'finds the accounts whose application roles include a requested role',
      async ({ apiClient, uiamServiceAccounts }) => {
        // Role names unique to this run, so accounts other tests left in UIAM can't match. UIAM
        // accepts role names that don't exist on the project.
        const role = `scout-role-${randomUUID()}`;
        const otherRole = `scout-role-${randomUUID()}`;
        const holder = await uiamServiceAccounts.create({
          name: `scout-sa-${randomUUID()}`,
          roles: [role, 'viewer'],
        });
        const otherHolder = await uiamServiceAccounts.create({
          name: `scout-sa-${randomUUID()}`,
          roles: [otherRole],
        });
        const unrelated = await uiamServiceAccounts.create({
          name: `scout-sa-${randomUUID()}`,
          roles: ['viewer'],
        });

        const response = await apiClient.post(FIND_BY_ROLES_ENDPOINT, {
          headers,
          responseType: 'json',
          body: { roles: [role, otherRole] },
        });

        expect(response).toHaveStatusCode(200);
        const { serviceAccounts } = response.body as FindResponse;
        const byId = new Map(serviceAccounts.map((account) => [account.id, account]));
        expect(byId.get(holder.id)).toStrictEqual({
          id: holder.id,
          name: holder.name,
          roles: [role],
          enabled: true,
          workloadCount: 0,
        });
        expect(byId.get(otherHolder.id)?.roles).toStrictEqual([otherRole]);
        expect(byId.has(unrelated.id)).toBe(false);
      }
    );

    apiTest('rejects an empty list of roles', async ({ apiClient }) => {
      const response = await apiClient.post(FIND_BY_ROLES_ENDPOINT, {
        headers,
        responseType: 'json',
        body: { roles: [] },
      });

      expect(response).toHaveStatusCode(400);
    });
  }
);
