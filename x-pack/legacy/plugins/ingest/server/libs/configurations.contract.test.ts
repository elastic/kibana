/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigurationLib } from './configuration';
import { callWhenOnline } from '@mattapperson/slapshot/lib/call_when_online';
import { MemorizedConfigAdapter } from './adapters/configurations/memorized';
import { ConfigAdapter } from './adapters/configurations/default';
import { SODatabaseAdapter } from './adapters/so_database/default';
import { BackendFrameworkLib } from './framework';
import { MemorizedBackendFrameworkAdapter } from './adapters/framework/memorized';
import { BackendFrameworkAdapter } from './adapters/framework/default';
import { camelCase } from 'lodash';
import { PLUGIN } from '../../common/constants';
import { CONFIG_PREFIX } from '../../common/constants/plugin';
import { createKibanaServer } from '../../../../../test_utils/jest/contract_tests/servers';

describe('Configurations Lib', () => {
  let realConfigAdapter: ConfigAdapter;
  let servers: any;
  let lib: ConfigurationLib;
  let realFrameworkAdapter: BackendFrameworkAdapter;

  beforeAll(async () => {
    await callWhenOnline(async () => {
      servers = await createKibanaServer({
        security: { enabled: true },
      });
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
      await realFrameworkAdapter.waitForStack();
    });

    const memorizedConfigAdapter = new MemorizedConfigAdapter(realConfigAdapter) as ConfigAdapter;
    const memorizedFrameworkAdapter = new MemorizedBackendFrameworkAdapter(
      realFrameworkAdapter
    ) as BackendFrameworkAdapter;

    const framework = new BackendFrameworkLib(memorizedFrameworkAdapter);
    lib = new ConfigurationLib(memorizedConfigAdapter, { framework });
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown();
    }
  });

  describe('create', () => {
    it('should create a new configuration', async () => {
      const newConfig = await lib.create('test', 'test description');

      expect(typeof newConfig.id).toBe('string');
      expect(typeof newConfig.shared_id).toBe('string');
      expect(typeof newConfig.version).toBe('number');
    });
  });
});
