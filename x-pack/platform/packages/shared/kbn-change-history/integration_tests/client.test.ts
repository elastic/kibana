/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { FLAGS } from '../src/constants';
import { ChangeHistoryClient, ILM_POLICY_NAME } from '..';
import { DATA_STREAM_NAME } from '../src/client';
import type { ObjectChange } from '..';
import { sha256 } from '../src/utils';
import { encodePrimaryStoreVersion, occNumeric } from '../test_utils_occ';
import {
  ChangeHistoryInvalidOccError,
  ChangeHistoryInvalidPrimaryStoreVersionError,
} from '../src/errors';

const KIBANA_SPACE = 'default';
const TEST_MODULE = 'test-module';
const TEST_DATASET = 'test-dataset';

const defaultLogOpts = {
  action: 'rule_create',
  username: 'test-user',
  userProfileId: 'test-user-profile-id',
  spaceId: 'default',
  refresh: true as const,
};

describe('ChangeHistoryClient', () => {
  let esServer: EsTestCluster;
  const logger = loggingSystemMock.createLogger();

  const defaultCostructorOpts = {
    module: TEST_MODULE,
    dataset: TEST_DATASET,
    logger,
    kibanaVersion: '1.0.0',
  };

  const cleanup = async () => {
    const client = esServer.getClient();
    await client.indices.deleteDataStream({ name: DATA_STREAM_NAME }).catch(() => {});
    await client.indices.deleteIndexTemplate({ name: DATA_STREAM_NAME }).catch(() => {});
    await client.ilm.deleteLifecycle({ name: ILM_POLICY_NAME }).catch(() => {});
  };

  beforeAll(async () => {
    FLAGS.FEATURE_ENABLED = true;
    jest.setTimeout(30_000);
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'debug' }),
    });
    await esServer.start();
  });

  afterAll(async () => {
    await esServer.stop();
    FLAGS.FEATURE_ENABLED = false;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('initialize', () => {
    const getEsDataStreams = async (name: string) => {
      try {
        const res = await esServer.getClient().indices.getDataStream({ name });
        return res?.data_streams?.map((s) => s.name) ?? [];
      } catch (error) {
        if (
          error.meta?.statusCode === 404 &&
          error.body?.error?.type === 'index_not_found_exception'
        ) {
          return [];
        }
        throw error;
      }
    };

    it('should initialize the data stream', async () => {
      const client = new ChangeHistoryClient(defaultCostructorOpts);
      expect(client.isInitialized()).toBe(false);

      expect(await getEsDataStreams(DATA_STREAM_NAME)).toHaveLength(0);

      await client.initialize(esServer.getClient());
      expect(client.isInitialized()).toBe(true);

      expect(await getEsDataStreams(DATA_STREAM_NAME)).toEqual([DATA_STREAM_NAME]);

      const result = await client.getHistory(KIBANA_SPACE, 'rule', 'any-id');
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    describe('ILM policy', () => {
      const getInstalledPolicy = async () => {
        const res = await esServer.getClient().ilm.getLifecycle({ name: ILM_POLICY_NAME });
        return res[ILM_POLICY_NAME]?.policy;
      };
      const getBackingIndexLifecycleName = async () => {
        const settings = await esServer
          .getClient()
          .indices.getSettings({ index: DATA_STREAM_NAME, expand_wildcards: ['hidden', 'open'] });
        const [first] = Object.values(settings);
        return first?.settings?.index?.lifecycle?.name;
      };

      it('installs the ILM policy and points the index template at it', async () => {
        const esClient = esServer.getClient();
        await expect(esClient.ilm.getLifecycle({ name: ILM_POLICY_NAME })).rejects.toMatchObject({
          meta: { statusCode: 404 },
        });

        const client = new ChangeHistoryClient(defaultCostructorOpts);
        await client.initialize(esClient);

        const policy = await getInstalledPolicy();
        expect(policy).toEqual({
          _meta: { managed: true },
          phases: { hot: { min_age: '0ms', actions: {} } },
        });

        const template = await esClient.indices.getIndexTemplate({ name: DATA_STREAM_NAME });
        expect(
          template.index_templates[0]?.index_template?.template?.settings?.index?.lifecycle?.name
        ).toBe(ILM_POLICY_NAME);

        expect(await getBackingIndexLifecycleName()).toBe(ILM_POLICY_NAME);
      });

      it('does not overwrite an admin-modified ILM policy on re-initialize', async () => {
        const esClient = esServer.getClient();

        const customPolicy = {
          _meta: { managed: false, modified_by: 'admin' },
          phases: {
            hot: {
              actions: {
                rollover: { max_age: '7d', max_primary_shard_size: '25gb' },
              },
            },
            delete: { min_age: '90d', actions: { delete: {} } },
          },
        };
        await esClient.ilm.putLifecycle({ name: ILM_POLICY_NAME, policy: customPolicy });

        const client = new ChangeHistoryClient(defaultCostructorOpts);
        await client.initialize(esClient);

        const policy = await getInstalledPolicy();
        expect(policy?._meta).toEqual({ managed: false, modified_by: 'admin' });
        expect(policy?.phases?.hot?.actions?.rollover).toEqual({
          max_age: '7d',
          max_primary_shard_size: '25gb',
        });
        expect(policy?.phases?.delete).toBeDefined();
      });
    });
  });

  describe('error behavior', () => {
    it('should throw when creating with invalid module or dataset', async () => {
      await expect(
        () => new ChangeHistoryClient({ ...defaultCostructorOpts, module: 'invalid|module' })
      ).toThrow('Invalid module');
      await expect(
        () => new ChangeHistoryClient({ ...defaultCostructorOpts, dataset: 'invalid|dataset' })
      ).toThrow('Invalid dataset');
    });

    it('should throw when log is called before initialize', async () => {
      const client = new ChangeHistoryClient(defaultCostructorOpts);
      const change: ObjectChange = {
        objectType: 'rule',
        objectId: 'id-1',
        snapshot: { name: 'Rule 1' },
        ...occNumeric(1),
      };
      await expect(() =>
        client.log(change, { ...defaultLogOpts, spaceId: 'default' })
      ).rejects.toThrow('Change history data stream not initialized');
    });

    it('should throw when getHistory is called before initialize', async () => {
      const client = new ChangeHistoryClient(defaultCostructorOpts);
      await expect(() => client.getHistory(KIBANA_SPACE, 'rule', 'id-1')).rejects.toThrow(
        'Change history data stream not initialized'
      );
    });

    it('should throw when log is called without OCC fields', async () => {
      const client = new ChangeHistoryClient(defaultCostructorOpts);
      await client.initialize(esServer.getClient());
      const change: ObjectChange = {
        objectType: 'rule',
        objectId: 'id-1',
        snapshot: { name: 'Rule 1' },
      };
      await expect(() =>
        client.log(change, { ...defaultLogOpts, spaceId: 'default' })
      ).rejects.toThrow(ChangeHistoryInvalidOccError);
    });
  });

  describe('log and getHistory', () => {
    let client: ChangeHistoryClient;
    let esClient: Client;

    beforeEach(async () => {
      esClient = esServer.getClient();
      client = new ChangeHistoryClient(defaultCostructorOpts);
      await client.initialize(esClient);
    });

    it('should log one change and return it via getHistory', async () => {
      const change: ObjectChange = {
        objectType: 'rule',
        objectId: 'id-1',
        sequence: 1,
        ...occNumeric(1),
        snapshot: { name: 'Rule 1', enabled: true },
      };
      const hash = sha256(JSON.stringify(change.snapshot));
      await client.log(change, { ...defaultLogOpts, spaceId: 'default' });

      const result = await client.getHistory(KIBANA_SPACE, 'rule', 'id-1');
      expect(result.total).toBe(1);
      expect(result.items.length).toBe(1);
      const doc = result.items[0];
      expect(doc).toMatchObject({
        '@timestamp': expect.any(String),
        ecs: { version: '9.3.0' },
        user: { name: 'test-user', id: 'test-user-profile-id' },
        event: {
          id: expect.any(String),
          created: expect.any(String),
          module: TEST_MODULE,
          dataset: TEST_DATASET,
          action: 'rule_create',
          type: 'change',
        },
        object: {
          type: 'rule',
          id: 'id-1',
          hash,
          seqNo: 1,
          primaryTerm: 1,
          sequence: 1,
          fields: { hashed: [] },
          snapshot: { name: 'Rule 1', enabled: true },
        },
        service: {
          type: 'kibana',
          version: expect.any(String),
        },
      });
      expect(doc).not.toHaveProperty('kibana');
    });

    it('should persist seqNo and primaryTerm from primaryStoreVersion', async () => {
      const change: ObjectChange = {
        objectType: 'rule',
        objectId: 'id-so',
        primaryStoreVersion: encodePrimaryStoreVersion(7, 2),
        snapshot: { name: 'Rule SO path' },
      };
      await client.log(change, { ...defaultLogOpts, spaceId: 'default' });

      const result = await client.getHistory(KIBANA_SPACE, 'rule', 'id-so');
      expect(result.items[0].object).toMatchObject({
        seqNo: 7,
        primaryTerm: 2,
      });
    });
  });

  describe('logBulk and getHistory', () => {
    let client: ChangeHistoryClient;

    beforeEach(async () => {
      client = new ChangeHistoryClient(defaultCostructorOpts);
      await client.initialize(esServer.getClient());
    });

    it('should log multiple changes and return them via getHistory with correct count and ordering', async () => {
      const timestamp = new Date(Date.now() - 1).toISOString();
      const changes: ObjectChange[] = [
        {
          objectType: 'rule',
          objectId: 'id-a',
          snapshot: { name: 'Rule A update 1' },
          ...occNumeric(1),
        },
        {
          objectType: 'rule',
          objectId: 'id-c',
          snapshot: { name: 'Rule C update 3' },
          ...occNumeric(3),
        },
        {
          objectType: 'rule',
          objectId: 'id-b',
          snapshot: { name: 'Rule B update 3' },
          sequence: 3,
          ...occNumeric(3),
        },
        {
          objectType: 'rule',
          objectId: 'id-a',
          snapshot: { name: 'Rule A update 2' },
          ...occNumeric(2),
        },
      ];
      await client.logBulk(changes, { ...defaultLogOpts, spaceId: 'default' });
      const changes2: ObjectChange[] = [
        {
          objectType: 'rule',
          objectId: 'id-a',
          snapshot: { name: 'Rule A update 3' },
          ...occNumeric(3),
        },
        {
          objectType: 'rule',
          objectId: 'id-c',
          snapshot: { name: 'Rule C update 1' },
          timestamp,
          ...occNumeric(1),
        },
        {
          objectType: 'rule',
          objectId: 'id-b',
          snapshot: { name: 'Rule B update 1' },
          sequence: 1,
          ...occNumeric(1),
        },
        {
          objectType: 'rule',
          objectId: 'id-b',
          snapshot: { name: 'Rule B update 2' },
          sequence: 2,
          ...occNumeric(2),
        },
        {
          objectType: 'rule',
          objectId: 'id-c',
          snapshot: { name: 'Rule C update 2' },
          timestamp,
          ...occNumeric(2),
        },
        {
          objectType: 'rule',
          objectId: 'id-c',
          snapshot: { name: 'Rule C update 4' },
          ...occNumeric(4),
        },
      ];
      await client.logBulk(changes2, { ...defaultLogOpts, spaceId: 'default' });

      // Check Rule A
      const resultA = await client.getHistory(KIBANA_SPACE, 'rule', 'id-a');
      expect(resultA.total).toBe(3);
      const snapshotsA = resultA.items.map((i) => i.object.snapshot);
      expect(snapshotsA).toEqual([
        { name: 'Rule A update 3' },
        { name: 'Rule A update 2' },
        { name: 'Rule A update 1' },
      ]);

      // Check Rule B
      const resultB = await client.getHistory(KIBANA_SPACE, 'rule', 'id-b');
      expect(resultB.total).toBe(3);
      const snapshotsB = resultB.items.map((i) => i.object.snapshot);
      expect(snapshotsB).toEqual([
        { name: 'Rule B update 3' },
        { name: 'Rule B update 2' },
        { name: 'Rule B update 1' },
      ]);

      // Check Rule C
      const resultC = await client.getHistory(KIBANA_SPACE, 'rule', 'id-c');
      expect(resultC.total).toBe(4);
      const snapshotsC = resultC.items.map((i) => i.object.snapshot);
      expect(snapshotsC).toEqual([
        { name: 'Rule C update 4' },
        { name: 'Rule C update 3' },
        { name: 'Rule C update 2' },
        { name: 'Rule C update 1' },
      ]);

      // Check decreasing Event Ids
      // (reverse order in the output)
      const eventIds = resultA.items.map((i) => i.event.id);
      expect(eventIds).toEqual(eventIds.slice().sort().reverse());

      // Check decreasing OCC seqNo
      const seqNosB = resultB.items.map((i) => i.object.seqNo);
      expect(seqNosB).toEqual(seqNosB.slice().sort().reverse());

      // Check decreasing OCC seqNo (Rule C ordering is by OCC, not @timestamp)
      const seqNosC = resultC.items.map((i) => i.object.seqNo);
      expect(seqNosC).toEqual(seqNosC.slice().sort().reverse());
    });

    it('should not throw on partial success when some bulk items fail', async () => {
      const changes: ObjectChange[] = [
        {
          objectType: 'rule',
          objectId: 'rule-id',
          snapshot: { name: 'First Rule' },
          ...occNumeric(1),
        },
        {
          objectType: 'rule',
          objectId: 'rule-id',
          snapshot: { name: 'Unindexable — bad sequence type' },
          ...occNumeric(2),
          // Intentionally wrong runtime type for ES (integration test only).
          sequence: 'not-an-integer' as unknown as number,
        },
        {
          objectType: 'rule',
          objectId: 'rule-id',
          snapshot: { name: 'Also unindexable — bad sequence type' },
          ...occNumeric(3),
          sequence: {} as unknown as number,
        },
        {
          objectType: 'rule',
          objectId: 'rule-id',
          snapshot: { name: 'Last Rule' },
          ...occNumeric(4),
        },
      ];
      await expect(
        client.logBulk(changes, { ...defaultLogOpts, spaceId: 'default' })
      ).resolves.not.toThrow();

      const result = await client.getHistory(KIBANA_SPACE, 'rule', 'rule-id');
      expect(result.total).toBe(2);
      const snapshots = result.items.map((i) => i.object.snapshot);
      expect(snapshots[0]).toEqual({ name: 'Last Rule' });
      expect(snapshots[1]).toEqual({ name: 'First Rule' });
    });
  });

  describe('OCC scenarios', () => {
    let client: ChangeHistoryClient;

    beforeEach(async () => {
      client = new ChangeHistoryClient(defaultCostructorOpts);
      await client.initialize(esServer.getClient());
    });

    it('sorts by primaryTerm before seqNo (newer term wins despite lower seqNo)', async () => {
      const objectId = 'occ-term-order';
      await client.logBulk(
        [
          {
            objectType: 'rule',
            objectId,
            snapshot: { name: 'older term, high seq' },
            ...occNumeric(99, 3),
          },
          {
            objectType: 'rule',
            objectId,
            snapshot: { name: 'newer term, low seq' },
            ...occNumeric(1, 4),
          },
        ],
        { ...defaultLogOpts, spaceId: 'default' }
      );

      const result = await client.getHistory(KIBANA_SPACE, 'rule', objectId);
      expect(result.items.map((i) => i.object.snapshot)).toEqual([
        { name: 'newer term, low seq' },
        { name: 'older term, high seq' },
      ]);
      expect(result.items[0].object).toMatchObject({ seqNo: 1, primaryTerm: 4 });
      expect(result.items[1].object).toMatchObject({ seqNo: 99, primaryTerm: 3 });
    });

    it('orders by seqNo within the same primaryTerm', async () => {
      const objectId = 'occ-seq-order';
      await client.logBulk(
        [
          {
            objectType: 'rule',
            objectId,
            snapshot: { name: 'revision 5' },
            ...occNumeric(5, 1),
          },
          {
            objectType: 'rule',
            objectId,
            snapshot: { name: 'revision 10' },
            ...occNumeric(10, 1),
          },
        ],
        { ...defaultLogOpts, spaceId: 'default' }
      );

      const result = await client.getHistory(KIBANA_SPACE, 'rule', objectId);
      expect(result.items.map((i) => i.object.seqNo)).toEqual([10, 5]);
    });

    it('does not persist primaryStoreVersion on the indexed document', async () => {
      const change: ObjectChange = {
        objectType: 'rule',
        objectId: 'occ-no-opaque-on-index',
        primaryStoreVersion: encodePrimaryStoreVersion(2, 1),
        snapshot: { name: 'indexed' },
      };
      await client.log(change, { ...defaultLogOpts, spaceId: 'default' });

      const result = await client.getHistory(KIBANA_SPACE, 'rule', 'occ-no-opaque-on-index');
      const doc = result.items[0];
      expect(doc.object).toMatchObject({ seqNo: 2, primaryTerm: 1 });
      expect(doc.object).not.toHaveProperty('primaryStoreVersion');
    });

    it('rejects logBulk when both OCC wire shapes are set', async () => {
      await expect(
        client.logBulk(
          [
            {
              objectType: 'rule',
              objectId: 'xor-both',
              primaryStoreVersion: encodePrimaryStoreVersion(1, 1),
              ...occNumeric(1, 1),
              snapshot: { name: 'invalid' },
            },
          ],
          { ...defaultLogOpts, spaceId: 'default' }
        )
      ).rejects.toThrow(ChangeHistoryInvalidOccError);

      const result = await client.getHistory(KIBANA_SPACE, 'rule', 'xor-both');
      expect(result.total).toBe(0);
    });

    it('rejects logBulk with invalid primaryStoreVersion before indexing', async () => {
      await expect(
        client.logBulk(
          [
            {
              objectType: 'rule',
              objectId: 'bad-opaque',
              primaryStoreVersion: 'not-base64-json',
              snapshot: { name: 'invalid' },
            },
          ],
          { ...defaultLogOpts, spaceId: 'default' }
        )
      ).rejects.toThrow(ChangeHistoryInvalidPrimaryStoreVersionError);

      const result = await client.getHistory(KIBANA_SPACE, 'rule', 'bad-opaque');
      expect(result.total).toBe(0);
    });

    it('ignores optional sequence when OCC differs (sequence does not override sort)', async () => {
      const objectId = 'occ-over-sequence';
      await client.logBulk(
        [
          {
            objectType: 'rule',
            objectId,
            snapshot: { name: 'low OCC, high sequence' },
            sequence: 999,
            ...occNumeric(1, 1),
          },
          {
            objectType: 'rule',
            objectId,
            snapshot: { name: 'high OCC, low sequence' },
            sequence: 1,
            ...occNumeric(50, 1),
          },
        ],
        { ...defaultLogOpts, spaceId: 'default' }
      );

      const result = await client.getHistory(KIBANA_SPACE, 'rule', objectId);
      expect(result.items.map((i) => i.object.snapshot)).toEqual([
        { name: 'high OCC, low sequence' },
        { name: 'low OCC, high sequence' },
      ]);
    });
  });

  describe('hashing selected fields', () => {
    let client: ChangeHistoryClient;

    beforeEach(async () => {
      client = new ChangeHistoryClient(defaultCostructorOpts);
      await client.initialize(esServer.getClient());
    });

    it('should hash sensitive fields in snapshot and list paths in object.fields.hashed', async () => {
      const change: ObjectChange = {
        objectType: 'rule',
        objectId: 'masked-id',
        ...occNumeric(1),
        snapshot: {
          name: 'My Rule',
          user: { email: 'secret@example.com', name: 'Alice' },
          apiKey: 'sk-secret-key-12345',
        },
      };
      const fieldsToHash = {
        user: { email: true },
        apiKey: true,
      };
      await client.log(change, {
        ...defaultLogOpts,
        spaceId: 'default',
        fieldsToHash,
      });

      const result = await client.getHistory(KIBANA_SPACE, 'rule', 'masked-id');
      expect(result.total).toBe(1);
      const doc = result.items[0];

      // Check hash
      const hash = sha256(JSON.stringify(change.snapshot));
      expect(doc.object.hash).toEqual(hash);

      // Check hashed field paths
      expect(doc.object.fields.hashed.sort()).toEqual(['apiKey', 'user.email'].sort());
      const snapshot = doc.object.snapshot as Record<string, unknown>;
      expect(snapshot).toEqual({
        name: 'My Rule',
        user: {
          email: sha256('secret@example.com'),
          name: 'Alice',
        },
        apiKey: sha256('sk-secret-key-12345'),
      });
    });
  });
});
