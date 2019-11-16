/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { FrameworkUser } from '../../adapters/framework/adapter_types';
import { MemorizedElasticsearchAdapter } from './memorize_adapter';
import { ElasticsearchAdapter } from './default';
import { ElasticsearchAdapter as ElasticsearchAdapterType } from './adapter_types';

describe('AgentsEventsRepository', () => {
  let servers: any;

  let esAdapter: ElasticsearchAdapterType;

  function getUser(): FrameworkUser {
    return ({
      kind: 'internal',
    } as unknown) as FrameworkUser;
  }

  beforeAll(async () => {
    await Slapshot.callWhenOnline(async () => {
      const { createKibanaServer } = await import(
        '../../../../../../test_utils/jest/contract_tests/servers'
      );
      servers = await createKibanaServer({
        security: { enabled: false },
      });

      esAdapter = new MemorizedElasticsearchAdapter(
        new ElasticsearchAdapter(servers.kbnServer.plugins.elasticsearch)
      );
    });

    if (!esAdapter) {
      esAdapter = new MemorizedElasticsearchAdapter();
    }
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown;
    }
  });

  describe('Api Keys', () => {
    it('allow to create and delete an api key', async () => {
      const key = await esAdapter.createApiKey(getUser(), {
        name: 'test api key',
      });
      expect(key).toHaveProperty('id');
      expect(key).toHaveProperty('api_key');
      await esAdapter.deleteApiKey(getUser(), {
        id: key.id,
      });
    });
  });
});
