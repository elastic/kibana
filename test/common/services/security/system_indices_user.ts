/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import {
  systemIndicesSuperuser,
  createEsClientForFtrConfig,
  createRemoteEsClientForFtrConfig,
} from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

const SYSTEM_INDICES_SUPERUSER_ROLE = 'system_indices_superuser';

async function ensureSystemIndicesUser(es: Client, log: ToolingLog) {
  // There are cases where the test config file doesn't have security disabled
  // but tests are still executed on ES without security. Checking this case
  // by trying to fetch the users list.
  try {
    await es.security.getUser();
  } catch (error) {
    log.debug('Could not fetch users, assuming security is disabled');
    return;
  }

  log.debug('===============creating system indices role and user===============');

  await es.security.putRole({
    name: SYSTEM_INDICES_SUPERUSER_ROLE,
    refresh: 'wait_for',
    cluster: ['all'],
    indices: [
      {
        names: ['*'],
        privileges: ['all'],
        allow_restricted_indices: true,
      },
    ],
    applications: [
      {
        application: '*',
        privileges: ['*'],
        resources: ['*'],
      },
    ],
    run_as: ['*'],
  });

  await es.security.putUser({
    username: systemIndicesSuperuser.username,
    refresh: 'wait_for',
    password: systemIndicesSuperuser.password,
    roles: [SYSTEM_INDICES_SUPERUSER_ROLE],
  });

  await es.close();
}

export async function createSystemIndicesUser(ctx: FtrProviderContext) {
  const log = ctx.getService('log');
  const config = ctx.getService('config');

  const enabled = !config
    .get('esTestCluster.serverArgs')
    .some((arg: string) => arg === 'xpack.security.enabled=false');

  if (!enabled) {
    return;
  }

  const localEs = createEsClientForFtrConfig(config);
  await ensureSystemIndicesUser(localEs, log);

  if (config.get('esTestCluster.ccs')) {
    const remoteEs = createRemoteEsClientForFtrConfig(config);
    await ensureSystemIndicesUser(remoteEs, log);
  }
}
