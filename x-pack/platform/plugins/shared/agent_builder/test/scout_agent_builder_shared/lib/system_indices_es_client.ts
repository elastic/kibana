/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ScoutTestConfig } from '@kbn/scout';
import { systemIndicesSuperuser } from '@kbn/test';
import { createEsClientForTesting } from '@kbn/test-es-server';

const SYSTEM_INDICES_SUPERUSER_ROLE = 'system_indices_superuser';

/**
 * Returns an ES client authenticated as `system_indices_superuser`, which has
 * `allow_restricted_indices: true` and can therefore read/write `.chat-*`
 * system indices from tests.
 *
 * - On stateful: provisions the role and user idempotently (the role yaml is
 *   preconfigured by `@kbn/es`, but the native-realm user is not).
 * - On serverless: the user is preconfigured by `@kbn/es` serverless
 *   resources, so no role/user mutations are performed.
 */
export async function createSystemIndicesEsClient(
  esClient: Client,
  config: ScoutTestConfig
): Promise<Client> {
  if (!config.serverless) {
    await esClient.security.putRole({
      name: SYSTEM_INDICES_SUPERUSER_ROLE,
      refresh: 'wait_for',
      cluster: ['all'],
      indices: [{ names: ['*'], privileges: ['all'], allow_restricted_indices: true }],
      applications: [{ application: '*', privileges: ['*'], resources: ['*'] }],
      run_as: ['*'],
    });

    await esClient.security.putUser({
      username: systemIndicesSuperuser.username,
      refresh: 'wait_for',
      password: systemIndicesSuperuser.password,
      roles: [SYSTEM_INDICES_SUPERUSER_ROLE],
    });
  }

  return createEsClientForTesting({
    esUrl: config.hosts.elasticsearch,
    authOverride: systemIndicesSuperuser,
    isCloud: config.isCloud,
  });
}
