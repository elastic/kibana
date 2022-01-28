/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { systemIndicesSuperuser } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';

const SYSTEM_INDICES_SUPERUSER_ROLE = 'system_indices_superuser';

export async function createSystemIndicesUser(ctx: FtrProviderContext) {
  const log = ctx.getService('log');
  const config = ctx.getService('config');
  const es = ctx.getService('esWithoutSystemIndices');

  const enabled = !config
    .get('esTestCluster.serverArgs')
    .some((arg: string) => arg === 'xpack.security.enabled=false');

  if (enabled) {
    log.debug('===============creating system indices role and user===============');

    await es.security.putRole({
      name: SYSTEM_INDICES_SUPERUSER_ROLE,
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
      password: systemIndicesSuperuser.password,
      roles: [SYSTEM_INDICES_SUPERUSER_ROLE],
    });
  }
}
