/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWhenOnline } from '@mattapperson/slapshot/lib/call_when_online';
import * as elasticsearch from 'elasticsearch';
import { INDEX_NAMES } from '../../common/constants/index_names';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { exampleStoredDatasource } from './adapters/datasource/adapter_types';
import { compose } from './compose/memorized';
import { ServerLibs, Datasource } from './types';

jest.mock('uuid/v4', () => {
  let uuid = 1;
  return () => `uuid-${uuid++}`;
});

describe('Datasources Lib', () => {
  let servers: any;
  let libs: ServerLibs;
  let es: elasticsearch.Client;
  const TestUser: FrameworkUser = { kind: 'internal' };

  beforeAll(async () => {
    await callWhenOnline(async () => {
      jest.setTimeout(300000);
      const { createKibanaServer } = await import(
        '../../../../../test_utils/jest/contract_tests/servers'
      );

      servers = await createKibanaServer({
        security: { enabled: true },
      });
      const esPolicy = JSON.parse(process.env.__JEST__ESServer || '');
      es = new elasticsearch.Client({
        hosts: esPolicy.hosts,
        httpAuth: esPolicy.username ? `${esPolicy.username}:${esPolicy.password}` : undefined,
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
      jest.setTimeout(300000);
      await es.deleteByQuery({
        index: INDEX_NAMES.INGEST,
        body: {
          conflicts: 'proceed',
          query: { match_all: {} },
        },
      });
    }
  });

  describe('create', () => {
    it('should create a datasource', async () => {
      const newDatasource = await libs.datasources.create(TestUser, exampleStoredDatasource);

      expect(typeof newDatasource.id).toBe('string');

      const gottenDatasource = (await libs.datasources.get(
        TestUser,
        newDatasource.id as string
      )) as Datasource;
      expect(gottenDatasource.name).toBe(exampleStoredDatasource.name);
    });
  });

  describe('list', () => {
    it('should list all datasources', async () => {
      const newDatasource = await libs.datasources.create(TestUser, {
        ...exampleStoredDatasource,
        name: 'test1',
      });
      const newDatasource2 = await libs.datasources.create(TestUser, {
        ...exampleStoredDatasource,
        name: 'test2',
      });
      const newDatasource3 = await libs.datasources.create(TestUser, {
        ...exampleStoredDatasource,
        name: 'test3',
      });

      expect(typeof newDatasource.id).toBe('string');
      expect(typeof newDatasource2.id).toBe('string');
      expect(typeof newDatasource3.id).toBe('string');

      const { items: gottenDatasources } = await libs.datasources.list(TestUser);
      expect(gottenDatasources.length).toBe(3);
      expect(gottenDatasources.find(c => c.id === newDatasource.id) !== undefined).toBe(true);
      expect(gottenDatasources.find(c => c.id === newDatasource2.id) !== undefined).toBe(true);
      expect(gottenDatasources.find(c => c.id === newDatasource3.id) !== undefined).toBe(true);
    });
  });

  describe('update', () => {
    it('should update a datasource', async () => {
      const newDatasource = await libs.datasources.create(TestUser, exampleStoredDatasource);
      const updated = await libs.datasources.update(TestUser, newDatasource.id as string, {
        name: 'foo',
      });
      expect(updated.name).toBe('foo');

      const gottenDatasource = (await libs.datasources.get(
        TestUser,
        newDatasource.id as string
      )) as Datasource;
      expect(gottenDatasource.name).toBe('foo');
    });

    describe.skip('finish update', () => {});
  });

  describe('delete', () => {
    it('Should delete the by the ID', async () => {
      const newDatasource = await libs.datasources.create(TestUser, exampleStoredDatasource);

      try {
        await libs.datasources.delete(TestUser, [newDatasource.id as string]);
      } catch (e) {
        expect(e).toBe(undefined);
      }

      const { items: gottenDatasources } = await libs.datasources.list(TestUser);
      expect(gottenDatasources.length).toBe(0);
    });
  });
});
