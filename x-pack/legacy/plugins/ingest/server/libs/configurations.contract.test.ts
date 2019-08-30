/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWhenOnline } from '@mattapperson/slapshot/lib/call_when_online';
import { createKibanaServer } from '../../../../../test_utils/jest/contract_tests/servers';
import { compose } from './compose/memorized';
import { ServerLibs } from './types';
import elasticsearch from 'elasticsearch';
import { FrameworkAuthenticatedUser } from './adapters/framework/adapter_types';
import { INDEX_NAMES } from '../../common/constants/index_names';

describe('Configurations Lib', () => {
  let servers: any;
  let libs: ServerLibs;
  let es: elasticsearch.Client;
  const TestUser: FrameworkAuthenticatedUser = {
    kind: 'authenticated',
    username: 'mattapperson',
    roles: ['fleet_admin'],
    full_name: null,
    email: null,
    enabled: true,
  };

  beforeAll(async () => {
    await callWhenOnline(async () => {
      servers = await createKibanaServer({
        security: { enabled: true },
      });
      const esConfig = JSON.parse(process.env.__JEST__ESServer || '');
      es = new elasticsearch.Client({
        hosts: esConfig.hosts,
        httpAuth: esConfig.username ? `${esConfig.username}:${esConfig.password}` : undefined,
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

  beforeEach(async () => {
    if (es) {
      es.deleteByQuery({
        index: INDEX_NAMES.INGEST,
        body: {
          conflicts: 'proceed',
          query: { match_all: {} },
        },
      });
    }
  });

  describe('create', () => {
    it('should create a new configuration', async () => {
      const newConfig = await libs.configuration.create(TestUser, 'test', 'test description');

      expect(typeof newConfig.id).toBe('string');
      expect(typeof newConfig.shared_id).toBe('string');
      expect(typeof newConfig.version).toBe('number');

      const gottenConfig = await libs.configuration.get(newConfig.id);
      expect(gottenConfig.name).toBe('test');
    });
  });

  describe('list', () => {
    it('should list all active configurations', async () => {
      const newConfig = await libs.configuration.create(TestUser, 'test', 'test description');
      const newConfig2 = await libs.configuration.create(TestUser, 'test2', 'test description');
      const newConfig3 = await libs.configuration.create(TestUser, 'test3', 'test description');

      expect(typeof newConfig.id).toBe('string');
      expect(typeof newConfig.shared_id).toBe('string');
      expect(typeof newConfig.version).toBe('number');

      const gottenConfigs = await libs.configuration.list();
      expect(gottenConfigs.length).toBe(3);
      expect(gottenConfigs.find(c => c.id === newConfig.id) !== undefined).toBe(true);
      expect(gottenConfigs.find(c => c.id === newConfig2.id) !== undefined).toBe(true);
      expect(gottenConfigs.find(c => c.id === newConfig3.id) !== undefined).toBe(true);
    });

    it('should not list inactive configurations', async () => {
      const newConfig = await libs.configuration.create(TestUser, 'test', 'test description');
      const updated = await libs.configuration.update(newConfig.id, {
        name: 'foo',
      });
      const newConfig2 = await libs.configuration.create(TestUser, 'test2', 'test description');
      const newConfig3 = await libs.configuration.create(TestUser, 'test3', 'test description');

      expect(typeof newConfig.id).toBe('string');
      expect(typeof newConfig.shared_id).toBe('string');
      expect(typeof newConfig.version).toBe('number');

      const gottenConfigs = await libs.configuration.list();
      expect(gottenConfigs.length).toBe(3);
      expect(gottenConfigs.find(c => c.id === updated.id) !== undefined).toBe(true);
      expect(gottenConfigs.find(c => c.id === newConfig2.id) !== undefined).toBe(true);
      expect(gottenConfigs.find(c => c.id === newConfig3.id) !== undefined).toBe(true);
    });
  });

  describe('update', () => {
    it('should update a config and invalidate the origional', async () => {
      const newConfig = await libs.configuration.create(TestUser, 'test', 'test description');
      const updated = await libs.configuration.update(newConfig.id, {
        name: 'foo',
      });
      expect(updated.id).not.toBe(newConfig.id);
      expect(updated.version).toBe(newConfig.version + 1);
      expect(updated.shared_id).toBe(newConfig.shared_id);

      const gottenConfig = await libs.configuration.get(updated.id);
      expect(gottenConfig.name).toBe('foo');

      const origConfig = await libs.configuration.get(newConfig.id);
      expect(origConfig.status).toBe('locked');
    });
  });

  describe('list versions', () => {
    it('Should list past locked versions of a configuration', async () => {
      const newConfig = await libs.configuration.create(TestUser, 'test', 'test description');
      await libs.configuration.update(newConfig.id, {
        name: 'foo',
      });

      const gottenConfigs = await libs.configuration.listVersions(newConfig.shared_id, false);
      expect(gottenConfigs.length).toBe(2);
      expect(gottenConfigs.filter(c => c.status === 'active').length).toBe(1);
      expect(gottenConfigs.filter(c => c.status === 'locked').length).toBe(1);
    });
  });
});
