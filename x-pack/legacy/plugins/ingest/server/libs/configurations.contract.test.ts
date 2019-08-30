/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWhenOnline } from '@mattapperson/slapshot/lib/call_when_online';
import { createKibanaServer } from '../../../../../test_utils/jest/contract_tests/servers';
import { compose } from './compose/memorized';
import { ServerLibs } from './types';

describe('Configurations Lib', () => {
  let servers: any;
  let libs: ServerLibs;

  beforeAll(async () => {
    await callWhenOnline(async () => {
      servers = await createKibanaServer({
        security: { enabled: true },
      });
    });

    libs = compose(servers);
    await libs.framework.waitForStack();
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown();
    }
  });

  describe('create', () => {
    it('should create a new configuration', async () => {
      const newConfig = await libs.configuration.create('test', 'test description');

      expect(typeof newConfig.id).toBe('string');
      expect(typeof newConfig.shared_id).toBe('string');
      expect(typeof newConfig.version).toBe('number');
    });
  });
});
