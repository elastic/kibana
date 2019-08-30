/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';
import { callWhenOnline } from '@mattapperson/slapshot/lib/call_when_online';
import { PLUGIN } from '../../../common/constants';
import { CONFIG_PREFIX } from '../../../common/constants/plugin';
import { ESDatabaseAdapter } from '../adapters/es_database/default';
import { BackendFrameworkAdapter } from '../adapters/framework/default';
import { ServerLibs } from '../types';
import { BackendFrameworkLib } from './../framework';
import { ConfigurationLib } from '../configuration';
import { ConfigAdapter } from '../adapters/configurations/default';
import { SODatabaseAdapter } from '../adapters/so_database/default';
import { KibanaLegacyServer } from '../adapters/framework/adapter_types';
import { Root } from '../../../../../../../data/.update_prs/src/core/server/root/index';
import { MemorizedConfigAdapter } from '../adapters/configurations/memorized';
import { MemorizedBackendFrameworkAdapter } from '../adapters/framework/memorized';

export function compose(servers?: {
  shutdown: () => Promise<void>;
  kbnServer: KibanaLegacyServer;
  root: Root;
}): ServerLibs {
  let realConfigAdapter: ConfigAdapter;
  let realFrameworkAdapter: BackendFrameworkAdapter;

  callWhenOnline(() => {
    if (!servers) {
      throw new Error(
        'servers must be passed into compose when called using online contract tests'
      );
    }
    const soAdapter = new SODatabaseAdapter(
      servers.kbnServer.savedObjects,
      servers.kbnServer.plugins.elasticsearch
    );
    realConfigAdapter = new ConfigAdapter(soAdapter);
    realFrameworkAdapter = new BackendFrameworkAdapter(
      camelCase(PLUGIN.ID),
      servers.kbnServer,
      CONFIG_PREFIX
    );
  });

  const memorizedFrameworkAdapter = new MemorizedBackendFrameworkAdapter(
    realFrameworkAdapter!
  ) as BackendFrameworkAdapter;
  const framework = new BackendFrameworkLib(memorizedFrameworkAdapter);

  const memorizedConfigAdapter = new MemorizedConfigAdapter(realConfigAdapter!) as ConfigAdapter;
  const configuration = new ConfigurationLib(memorizedConfigAdapter, { framework });

  const libs: ServerLibs = {
    configuration,
    framework,
    database: new Proxy(
      {},
      {
        get() {
          throw new Error(
            'The database lib is not implamented in the momorized composition of libs yet'
          );
        },
      }
    ) as ESDatabaseAdapter,
  };

  return libs;
}
