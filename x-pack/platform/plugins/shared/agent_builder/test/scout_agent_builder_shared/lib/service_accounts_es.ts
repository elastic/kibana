/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout';

export const ES_SERVICE_ACCOUNT_NAMESPACE = 'kibana';

const TOKEN_NAME = 'scout-test';

export const uniqueServiceAccountName = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

export interface TestServiceAccount {
  /** `<namespace>/<name>`, which Elasticsearch also reports as the account's username. */
  id: string;
  name: string;
  authHeader: { Authorization: string };
}

/**
 * Goes straight to Elasticsearch rather than through `POST /internal/security/service_account`:
 * that route needs `xpack.security.serviceAccounts.enabled` in the shared server config and
 * leaves an encrypted credential saved object behind, and the resulting account is the same.
 */
export async function createServiceAccountWithToken(
  esClient: EsClient,
  { name, roles }: { name: string; roles: string[] }
): Promise<TestServiceAccount> {
  await esClient.transport.request({
    method: 'PUT',
    path: `/_security/service/${ES_SERVICE_ACCOUNT_NAMESPACE}/${encodeURIComponent(name)}`,
    body: { roles },
    querystring: { refresh: 'wait_for' },
  });

  const { token } = await esClient.security.createServiceToken({
    namespace: ES_SERVICE_ACCOUNT_NAMESPACE,
    service: name,
    name: TOKEN_NAME,
  });

  return {
    id: `${ES_SERVICE_ACCOUNT_NAMESPACE}/${name}`,
    name,
    authHeader: { Authorization: `Bearer ${token.value}` },
  };
}

// Token first: a forced account delete can leave it behind, and a lingering token blocks
// recreating the name.
export async function deleteServiceAccount(esClient: EsClient, name: string): Promise<void> {
  await esClient.transport.request(
    {
      method: 'DELETE',
      path: `/_security/service/${ES_SERVICE_ACCOUNT_NAMESPACE}/${encodeURIComponent(
        name
      )}/credential/token/${TOKEN_NAME}`,
    },
    { ignore: [404] }
  );

  await esClient.transport.request(
    {
      method: 'DELETE',
      path: `/_security/service/${ES_SERVICE_ACCOUNT_NAMESPACE}/${encodeURIComponent(name)}`,
      querystring: { force: 'true' },
    },
    { ignore: [404] }
  );
}
