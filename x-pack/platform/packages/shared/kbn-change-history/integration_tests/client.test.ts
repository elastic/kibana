/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Client } from '@elastic/elasticsearch';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { ToolingLog } from '@kbn/tooling-log';
import type { EsTestCluster } from '@kbn/test';
import { createTestEsCluster } from '@kbn/test';
import { ChangeHistoryClient } from '..';
import type { ChangeHistoryDocument, ObjectChange } from '..';

const TEST_MODULE = 'test-module';
const TEST_DATASET = 'test-dataset';
const DATA_STREAM_NAME = `.kibana-change-history-${TEST_MODULE}-${TEST_DATASET}`;

const defaultLogOpts = {
  action: 'rule-create',
  username: 'test-user',
  spaceId: 'default',
  refresh: true as const,
};

describe('ChangeHistoryClient', () => {
  let esServer: EsTestCluster;
  let logger: Logger;

  const cleanup = async () => {
    const client = esServer.getClient();
    await client.indices.deleteDataStream({ name: DATA_STREAM_NAME }).catch(() => {});
    await client.indices.deleteIndexTemplate({ name: DATA_STREAM_NAME }).catch(() => {});
  };

  beforeAll(async () => {
    jest.setTimeout(30_000);
    esServer = createTestEsCluster({
      log: new ToolingLog({ writeTo: process.stdout, level: 'debug' }),
    });
    await esServer.start();
  });

  afterAll(async () => {
    await esServer.stop();
  });

  beforeEach(async () => {
    logger = loggingSystemMock.createLogger();
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('initialize', () => {
    const getEsDataStreams = async (name: string) => {
      try {
        return (await esServer.getClient().indices.getDataStream({ name }))?.data_streams ?? [];
      } catch (error) {
        return [];
      }
    };

    it('should set isInitialized to true after initialize and getHistory does not throw', async () => {
      const client = new ChangeHistoryClient({
        module: TEST_MODULE,
        dataset: TEST_DATASET,
        logger,
        kibanaVersion: '1.0.0',
      });
      expect(client.dataStreamName).toBe(DATA_STREAM_NAME);
      expect(client.isInitialized()).toBe(false);

      expect(await getEsDataStreams(DATA_STREAM_NAME)).toHaveLength(0);

      await client.initialize(esServer.getClient());
      expect(client.isInitialized()).toBe(true);

      const ds = await getEsDataStreams(DATA_STREAM_NAME);
      expect(ds).toHaveLength(1);
      expect(ds[0].name).toBe(DATA_STREAM_NAME);

      const result = await client.getHistory('rule', 'any-id');
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('error behavior', () => {
    it('should throw when log is called before initialize', async () => {
      const client = new ChangeHistoryClient({
        module: TEST_MODULE,
        dataset: TEST_DATASET,
        logger,
        kibanaVersion: '1.0.0',
      });
      const change: ObjectChange = {
        objectType: 'rule',
        objectId: 'id-1',
        after: { name: 'Rule 1' },
      };
      await expect(() =>
        client.log(change, { ...defaultLogOpts, spaceId: 'default' })
      ).rejects.toThrow('Data stream not initialized');
    });

    it('should throw when getHistory is called before initialize', async () => {
      const client = new ChangeHistoryClient({
        module: TEST_MODULE,
        dataset: TEST_DATASET,
        logger,
        kibanaVersion: '1.0.0',
      });
      await expect(() => client.getHistory('rule', 'id-1')).rejects.toThrow(
        'Data stream not initialized'
      );
    });
  });

  describe('log and getHistory', () => {
    let client: ChangeHistoryClient;
    let esClient: Client;

    beforeEach(async () => {
      esClient = esServer.getClient();
      client = new ChangeHistoryClient({
        module: TEST_MODULE,
        dataset: TEST_DATASET,
        logger,
        kibanaVersion: '1.0.0',
      });
      await client.initialize(esClient);
    });

    it('should log one change and return it via getHistory', async () => {
      const change: ObjectChange = {
        objectType: 'rule',
        objectId: 'id-1',
        after: { name: 'Rule 1', enabled: true },
      };
      await client.log(change, { ...defaultLogOpts, spaceId: 'default' });

      const result = await client.getHistory('rule', 'id-1');
      expect(result.total).toBe(1);
      expect(result.items.length).toBe(1);
      const doc = result.items[0] as ChangeHistoryDocument;
      expect(doc.object.type).toBe('rule');
      expect(doc.object.id).toBe('id-1');
      expect(doc.object.snapshot).toEqual({ name: 'Rule 1', enabled: true });
      expect(doc.event.action).toBe('rule-create');
      expect(doc.user.name).toBe('test-user');
      expect(doc.kibana.space_id).toBe('default');
      expect(doc.kibana.version).toBe('1.0.0');
      expect(doc.event.module).toBe(TEST_MODULE);
      expect(doc.event.dataset).toBe(TEST_DATASET);
    });
  });

  describe('logBulk and getHistory', () => {
    let client: ChangeHistoryClient;

    beforeEach(async () => {
      client = new ChangeHistoryClient({
        module: TEST_MODULE,
        dataset: TEST_DATASET,
        logger,
        kibanaVersion: '1.0.0',
      });
      await client.initialize(esServer.getClient());
    });

    it('should log multiple changes and return them via getHistory with correct count and ordering', async () => {
      const changes: ObjectChange[] = [
        { objectType: 'rule', objectId: 'id-a', after: { name: 'Rule A' }, sequence: '1' },
        { objectType: 'rule', objectId: 'id-b', after: { name: 'Rule B' }, sequence: '1' },
        { objectType: 'rule', objectId: 'id-a', after: { name: 'Rule A updated' }, sequence: '2' },
      ];
      await client.logBulk(changes, { ...defaultLogOpts, spaceId: 'default' });

      const resultA = await client.getHistory('rule', 'id-a');
      expect(resultA.total).toBe(2);
      expect(resultA.items.length).toBe(2);
      expect((resultA.items[0] as ChangeHistoryDocument).object.snapshot).toEqual({
        name: 'Rule A updated',
      });
      expect((resultA.items[1] as ChangeHistoryDocument).object.snapshot).toEqual({
        name: 'Rule A',
      });

      const resultB = await client.getHistory('rule', 'id-b');
      expect(resultB.total).toBe(1);
      expect((resultB.items[0] as ChangeHistoryDocument).object.snapshot).toEqual({
        name: 'Rule B',
      });
    });
  });

  describe('before/after diff', () => {
    let client: ChangeHistoryClient;

    beforeEach(async () => {
      client = new ChangeHistoryClient({
        module: TEST_MODULE,
        dataset: TEST_DATASET,
        logger,
        kibanaVersion: '1.0.0',
      });
      await client.initialize(esServer.getClient());
    });

    it('should populate object.fields.changed and object.oldvalues when "before" is provided', async () => {
      const change: ObjectChange = {
        objectType: 'rule',
        objectId: 'diff-id',
        before: { name: 'Old name', enabled: true },
        after: { name: 'New name', enabled: true },
      };
      await client.log(change, { ...defaultLogOpts, spaceId: 'default' });

      const result = await client.getHistory('rule', 'diff-id');
      expect(result.total).toBe(1);
      const doc = result.items[0] as ChangeHistoryDocument;
      expect(doc.object.fields.changed).toBeDefined();
      expect(doc.object.fields.changed).toContain('name');
      expect(doc.object.oldvalues).toBeDefined();
      expect(doc.object.oldvalues).toHaveProperty('name', 'Old name');
      expect(doc.object.snapshot).toHaveProperty('name', 'New name');
    });
  });

  describe('masking sensitive fields', () => {
    let client: ChangeHistoryClient;

    beforeEach(async () => {
      client = new ChangeHistoryClient({
        module: TEST_MODULE,
        dataset: TEST_DATASET,
        logger,
        kibanaVersion: '1.0.0',
      });
      await client.initialize(esServer.getClient());
    });

    const maskedValuePattern = /^[\*]{16}[a-f0-9]{12}$/;

    it('should mask sensitive fields in snapshot and list them in object.fields.masked', async () => {
      const change: ObjectChange = {
        objectType: 'rule',
        objectId: 'masked-id',
        after: {
          name: 'My Rule',
          user: { email: 'secret@example.com', name: 'Alice' },
          apiKey: 'sk-secret-key-12345',
        },
      };
      await client.log(change, {
        ...defaultLogOpts,
        spaceId: 'default',
        maskFields: {
          user: { email: true },
          apiKey: true,
        },
      });

      const result = await client.getHistory('rule', 'masked-id');
      expect(result.total).toBe(1);
      const doc = result.items[0] as ChangeHistoryDocument;

      expect(doc.object.fields.masked).toBeDefined();
      expect(doc.object.fields.masked).toContain('user.email');
      expect(doc.object.fields.masked).toContain('apiKey');
      expect(doc.object.fields.masked).toHaveLength(2);

      const snapshot = doc.object.snapshot as Record<string, unknown>;
      expect(snapshot.name).toBe('My Rule');
      expect(snapshot.user).toEqual({
        email: expect.stringMatching(maskedValuePattern),
        name: 'Alice',
      });
      expect(snapshot.apiKey).toMatch(maskedValuePattern);
    });
  });
});
