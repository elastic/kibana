/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { MemorizeFrameworkAdapter } from './memorize';
import { FrameworkAdapter } from './default';
import { FrameworkAdapter as FrameworkAdapterType } from './adapter_types';

describe('Agent Adapter', () => {
  let adapter: FrameworkAdapterType;
  let servers: any;

  beforeAll(async () => {
    await Slapshot.callWhenOnline(async () => {
      const { createKibanaServer } = await import(
        '../../../../../../../test_utils/jest/contract_tests/servers'
      );

      servers = await createKibanaServer({
        security: { enabled: false },
      });
      adapter = new MemorizeFrameworkAdapter(new FrameworkAdapter(servers.kbnServer));
    });

    if (!adapter) {
      adapter = new MemorizeFrameworkAdapter();
    }
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown;
    }
  });
  describe('getSetting', () => {
    it('Work', () => {
      const setting = adapter.getSetting('xpack.fleet.encryptionKey');

      expect(setting).toBe('xpack_fleet_default_encryptionKey');
    });
  });
});
