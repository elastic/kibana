/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWhenOnline } from '@mattapperson/slapshot/lib/call_when_online';
import * as elasticsearch from 'elasticsearch';
import { INDEX_NAMES } from '../../common/constants/index_names';
import { FrameworkUser } from './adapters/framework/adapter_types';
import { compose } from './compose/memorized';
import { ServerLibs } from './types';
import { Policy } from '../../common/types/domain_data';

jest.mock('uuid/v4', () => {
  let uuid = 1;
  return () => `uuid-${uuid++}`;
});

describe('Policies Lib', () => {
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
    it('should create a new policy', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');

      expect(typeof newPolicy.id).toBe('string');

      const gottenPolicy = (await libs.policy.get(TestUser, newPolicy.id as string)) as Policy;
      expect(gottenPolicy.name).toBe('test');
    });
  });

  describe('ensureDefaultPolicy', () => {
    it('should create a new default policy if none exists', async () => {
      await libs.policy.ensureDefaultPolicy();

      const { items: policies } = await libs.policy.list(TestUser);
      expect(policies).toHaveLength(1);

      expect(policies[0].id).toBe('default');
    });

    it('should not create the new default policy more than once', async () => {
      await libs.policy.ensureDefaultPolicy();
      await libs.policy.ensureDefaultPolicy();

      const { items: policies } = await libs.policy.list(TestUser);
      expect(policies).toHaveLength(1);
    });
  });

  describe('list', () => {
    it('should list all active policies', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');
      const newPolicy2 = await libs.policy.create(TestUser, 'test2', 'test description');
      const newPolicy3 = await libs.policy.create(TestUser, 'test3', 'test description');

      expect(typeof newPolicy.id).toBe('string');

      const { items: gottenPolicies } = await libs.policy.list(TestUser);
      expect(gottenPolicies.length).toBe(3);
      expect(gottenPolicies.find(c => c.id === newPolicy.id) !== undefined).toBe(true);
      expect(gottenPolicies.find(c => c.id === newPolicy2.id) !== undefined).toBe(true);
      expect(gottenPolicies.find(c => c.id === newPolicy3.id) !== undefined).toBe(true);
    });
  });

  describe('update', () => {
    it('should update a policy and invalidate the original', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');
      const updated = await libs.policy.update(TestUser, newPolicy.id as string, {
        name: 'foo',
      });
      expect(updated.name).toBe('foo');

      const gottenPolicy = (await libs.policy.get(TestUser, newPolicy.id as string)) as Policy;
      expect(gottenPolicy.name).toBe('foo');
    });

    it('should assign and unassign data sources to policy', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');
      const firstAssign = await libs.policy.assignDatasource(TestUser, newPolicy.id as string, [
        'foo',
        'bar',
      ]);
      expect(firstAssign.datasources).toEqual(['foo', 'bar']);

      const secondAssign = await libs.policy.assignDatasource(TestUser, newPolicy.id as string, [
        'test',
      ]);
      expect(secondAssign.datasources).toEqual(['foo', 'bar', 'test']);

      const unassigned = await libs.policy.unassignDatasource(TestUser, newPolicy.id as string, [
        'test',
        'foo',
      ]);
      expect(unassigned.datasources).toEqual(['bar']);
    });

    describe.skip('finish update', () => {});
  });

  describe('delete', () => {
    it('Should delete the by the ID', async () => {
      const newPolicy = await libs.policy.create(TestUser, 'test', 'test description');

      try {
        await libs.policy.delete(TestUser, [newPolicy.id as string]);
      } catch (e) {
        expect(e).toBe(undefined);
      }

      const { items: gottenPolicies } = await libs.policy.list(TestUser);
      expect(gottenPolicies.length).toBe(0);
    });

    it('Should never delete the default policy', async () => {
      expect(libs.policy.delete(TestUser, ['default'])).rejects.toThrowError(/Not allowed/);
    });
  });

  describe.skip('update / change hooks', () => {});
});
