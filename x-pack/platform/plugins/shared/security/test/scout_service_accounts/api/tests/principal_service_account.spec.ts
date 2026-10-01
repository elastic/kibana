/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

import {
  deleteServiceAccounts,
  type ServiceAccountPrincipal,
} from '../fixtures/service_account_cleanup';

const HEADERS = { 'kbn-xsrf': 'true', 'x-elastic-internal-origin': 'kibana' };
const PRINCIPAL_PATH = 'internal/service_accounts_test/_principal';
const TOKEN_NAME = 'principal-test';
const uniqueName = () => `sa-principal-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

apiTest.describe(
  'Classify real requests authenticated with an Elasticsearch service account token',
  { tag: ['@local-stateful-classic'] },
  () => {
    const roleName = uniqueName();
    const name = uniqueName();
    const account: ServiceAccountPrincipal = { namespace: 'kibana', name };

    apiTest.beforeAll(async ({ apiClient, esClient, samlAuth }) => {
      await esClient.security.putRole({
        name: roleName,
        cluster: ['monitor'],
        refresh: 'wait_for',
      });
      const created = await apiClient.post('internal/security/service_account', {
        headers: { ...(await samlAuth.asInteractiveUser('admin')).cookieHeader, ...HEADERS },
        body: { name, roles: [roleName] },
        responseType: 'json',
      });
      expect(created).toHaveStatusCode(200);
    });

    apiTest.afterAll(async ({ esClient, config }) => {
      const failures: Error[] = [];
      const cleanup = [
        async () =>
          esClient.security.deleteServiceToken(
            { namespace: account.namespace, service: name, name: TOKEN_NAME },
            { ignore: [404] }
          ),
        async () => deleteServiceAccounts(esClient, config, [account]),
        async () => esClient.security.deleteRole({ name: roleName, refresh: 'wait_for' }),
      ];
      for (const remove of cleanup) {
        try {
          await remove();
        } catch (error) {
          failures.push(
            error instanceof Error ? error : new Error('Principal fixture cleanup failed.')
          );
        }
      }
      if (failures.length)
        throw new AggregateError(failures, 'Service account principal cleanup failed.');
    });

    apiTest('classifies the request as that service account', async ({ apiClient, esClient }) => {
      const { token } = await esClient.security.createServiceToken({
        namespace: account.namespace,
        service: name,
        name: TOKEN_NAME,
      });

      const response = await apiClient.get(PRINCIPAL_PATH, {
        headers: { ...HEADERS, Authorization: `Bearer ${token.value}` },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(200);
      expect(response.body).toStrictEqual({
        principal: {
          type: 'service_account',
          variant: 'stack',
          serviceAccountId: `${account.namespace}/${name}`,
        },
      });
    });
  }
);
