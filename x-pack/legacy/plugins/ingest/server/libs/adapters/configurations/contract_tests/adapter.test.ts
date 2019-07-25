/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';

import { SODatabaseAdapter } from '../../so_database/default';
import { MockedSODatabaseAdapter } from '../../so_database/mocked_adapter';
import { createKibanaServer } from '../../../../../../../../test_utils/jest/contract_tests/servers';
import { ConfigAdapter } from '../default';
import { Root } from '../../../../../../../../../src/core/server/root';

const { callWhenOnline } = Slapshot;

let root: Root;
let adapter: ConfigAdapter;

describe('Configuration Adapter', () => {
  beforeAll(async () => {
    await callWhenOnline(async () => {
      const { kbnServer } = await createKibanaServer();
      const savedObjectsAdapter = new SODatabaseAdapter(
        kbnServer.savedObjects,
        kbnServer.plugins.elasticsearch
      );
      const mockedAdapter = new MockedSODatabaseAdapter(savedObjectsAdapter);
      adapter = new ConfigAdapter(mockedAdapter as SODatabaseAdapter);
    });

    if (!adapter) {
      adapter = new ConfigAdapter(new MockedSODatabaseAdapter() as SODatabaseAdapter);
    }
  });
  afterAll(async () => {
    await root.shutdown();
  });
  describe('create', () => {
    test('it should allow to create a new configration', async () => {
      const config = await adapter.create({
        agent_version: '1',
        description: 'test configuration',
        data_sources: [],
        monitoring_enabled: false,
        name: 'test_configuration',
        output: '',
      });

      expect(config).toBeDefined();
      expect(config.id).toBeDefined();
    });
  });
});
