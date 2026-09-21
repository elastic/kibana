/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';

import { SYSTEM_INDICES_SUPERUSER, SYSTEM_INDICES_SUPERUSER_PASSWORD } from '@kbn/es';
import type { ScoutTestConfig } from '@kbn/scout';
import { createEsClientForTesting } from '@kbn/test-es-server';

const SYSTEM_INDICES_SUPERUSER_ROLE = 'system_indices_superuser';

const systemIndicesSuperuser = {
  username: SYSTEM_INDICES_SUPERUSER,
  password: SYSTEM_INDICES_SUPERUSER_PASSWORD,
};

/**
 * Restricted system indices need this header on top of `allow_restricted_indices`, so every
 * request this client makes against `.kibana` has to carry it.
 */
export const SYSTEM_INDICES_HEADERS = { 'x-elastic-product-origin': 'kibana' };

/**
 * Returns an Elasticsearch client authenticated as `system_indices_superuser`, the only account
 * that can write restricted indices such as `.kibana`. Scout's own `esClient` authenticates as
 * `elastic`, whose `superuser` role stops short of them.
 *
 * `@kbn/es` bind-mounts the account into locally-managed serverless clusters, but a stateful
 * cluster gets the role definition and no account, so both are created here. Both calls are
 * idempotent, and neither works on Cloud, which is one more reason this suite is local-only.
 */
export const createSystemIndicesEsClient = async (
  esClient: Client,
  config: ScoutTestConfig
): Promise<Client> => {
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
};
