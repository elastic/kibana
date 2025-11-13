/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { Client as ESClient } from '@elastic/elasticsearch';
import { ElasticSearchSaver } from '..';
import type { Checkpoint, CheckpointTuple } from '@langchain/langgraph-checkpoint';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { uuid6 } from '@langchain/langgraph-checkpoint';
import {
  createCheckpointsStorage,
  createCheckpointWritesStorage,
} from '../../storage-adapter-checkpoint-saver/storage';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');
const THREAD_ID = '8625e438-f09d-46f4-ba67-1a3649ed5c5c';
const CHECKPOINT_NS = 'test-namespace';

// Define test checkpoints
const checkpoint1: Checkpoint = {
  v: 1,
  id: uuid6(-1),
  ts: '2025-07-22T17:42:34.754Z',
  channel_values: {
    someKey1: 'someValue1',
  },
  channel_versions: {
    someKey2: 1,
  },
  versions_seen: {
    someKey3: {
      someKey4: 1,
    },
  },
};

const checkpoint2: Checkpoint = {
  v: 1,
  id: uuid6(-1),
  ts: '2025-07-23T17:42:34.754Z',
  channel_values: {
    someKey1: 'someValue2',
  },
  channel_versions: {
    someKey2: 2,
  },
  versions_seen: {
    someKey3: {
      someKey4: 2,
    },
  },
};

describe('ElasticSearchSaver', () => {
  let esServer: TestElasticsearchUtils;
  let client: ESClient;
  let saver: ElasticSearchSaver;

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: jest.setTimeout,
    });

    esServer = await startES();

    // Create an Elasticsearch client
    client = new ESClient({
      node: esServer.hosts[0],
      auth: {
        username: esServer.username,
        password: esServer.password,
      },
    });
  });

  async function deleteIndices(indexPattern: string) {
    // Use indices.get to find indices matching the pattern
    const response = await client.indices
      .get({
        index: indexPattern,
        allow_no_indices: true,
        expand_wildcards: 'all',
      })
      .catch(() => ({}));

    const indexNames = Object.keys(response);

    if (indexNames.length === 0) {
      return;
    }

    // Delete indices by their specific names
    await client.indices.delete({
      index: indexNames.join(','),
      allow_no_indices: true,
    });
  }

  beforeEach(async () => {
    // Clean up indices before each test
    await deleteIndices('.chat-checkpoints*');
    await deleteIndices('.chat-checkpoint-writes*');

    const checkpointIndexPrefix = '.chat-';

    // Create storage adapters - they will create indices automatically on first write
    const checkpointsStorage = createCheckpointsStorage({
      indexPrefix: checkpointIndexPrefix,
      logger: mockLogger,
      esClient: client,
    });

    const checkpointWritesStorage = createCheckpointWritesStorage({
      indexPrefix: checkpointIndexPrefix,
      logger: mockLogger,
      esClient: client,
    });

    // Create a fresh saver for each test
    saver = new ElasticSearchSaver({
      refreshPolicy: 'wait_for',
      logger: mockLogger,
      checkpointIndex: `${checkpointIndexPrefix}${ElasticSearchSaver.defaultCheckpointIndex}`,
      checkpointWritesIndex: `${checkpointIndexPrefix}${ElasticSearchSaver.defaultCheckpointWritesIndex}`,
      checkpointsStorage: checkpointsStorage.getClient(),
      checkpointWritesStorage: checkpointWritesStorage.getClient(),
    });
  });

  afterAll(async () => {
    // Stop the ES server
    await esServer.stop();
  });

  it.each([[CHECKPOINT_NS], ['']])(
    'should save and retrieve checkpoints correctly for namespace %s',
    async (checkpointNs) => {
      const undefinedCheckpoint = await saver.getTuple({
        configurable: { thread_id: THREAD_ID },
      });
      expect(undefinedCheckpoint).toBeUndefined();

      const runnableConfig = await saver.put(
        { configurable: { thread_id: THREAD_ID, checkpoint_ns: checkpointNs } },
        checkpoint1,
        {
          source: 'update',
          step: -1,
          parents: {},
        }
      );
      expect(runnableConfig).toEqual({
        configurable: {
          thread_id: THREAD_ID,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpoint1.id,
        },
      });

      await saver.putWrites(
        {
          configurable: {
            checkpoint_id: checkpoint1.id,
            checkpoint_ns: checkpointNs,
            thread_id: THREAD_ID,
          },
        },
        [['test2', 'test3']],
        'test1'
      );

      const firstCheckpointTuple = await saver.getTuple({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: checkpointNs },
      });

      expect(firstCheckpointTuple?.config).toEqual({
        configurable: {
          thread_id: THREAD_ID,
          checkpoint_ns: checkpointNs,
          checkpoint_id: checkpoint1.id,
        },
      });
      expect(firstCheckpointTuple?.checkpoint).toEqual(checkpoint1);
      expect(firstCheckpointTuple?.parentConfig).toBeUndefined();
      expect(firstCheckpointTuple?.pendingWrites).toEqual([['test1', 'test2', 'test3']]);

      await saver.put(
        {
          configurable: {
            thread_id: THREAD_ID,
            checkpoint_id: '2025-07-22T17:41:26.732Z',
            checkpoint_ns: checkpointNs,
          },
        },
        checkpoint2,
        { source: 'update', step: -1, parents: {} }
      );

      await saver.put(
        {
          configurable: {
            thread_id: THREAD_ID,
            checkpoint_id: '2025-07-22T17:41:26.732Z',
            checkpoint_ns: checkpointNs,
          },
        },
        checkpoint2,
        { source: 'update', step: -1, parents: {} }
      );

      // verify that parentTs is set and retrieved correctly for second checkpoint
      const secondCheckpointTuple = await saver.getTuple({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: checkpointNs },
      });
      expect(secondCheckpointTuple?.parentConfig).toEqual({
        configurable: {
          thread_id: THREAD_ID,
          checkpoint_ns: checkpointNs,
          checkpoint_id: '2025-07-22T17:41:26.732Z',
        },
      });

      // list checkpoints
      const checkpointTupleGenerator = saver.list({
        configurable: { thread_id: THREAD_ID },
      });
      const checkpointTuples: CheckpointTuple[] = [];
      for await (const checkpoint of checkpointTupleGenerator) {
        checkpointTuples.push(checkpoint);
      }
      expect(checkpointTuples.length).toBe(2);

      const checkpointTuple1 = checkpointTuples[0];
      const checkpointTuple2 = checkpointTuples[1];
      expect(checkpointTuple1.checkpoint.ts).toBe('2025-07-23T17:42:34.754Z');
      expect(checkpointTuple2.checkpoint.ts).toBe('2025-07-22T17:42:34.754Z');
    }
  );

  describe('upsert operations', () => {
    it('should upsert checkpoint when calling put with the same checkpoint_id', async () => {
      const initialCheckpoint: Checkpoint = {
        v: 1,
        id: uuid6(-1),
        ts: '2025-07-22T17:42:34.754Z',
        channel_values: {
          initialKey: 'initialValue',
        },
        channel_versions: {
          version: 1,
        },
        versions_seen: {
          seen: {
            initial: 1,
          },
        },
      };

      const updatedCheckpoint: Checkpoint = {
        v: 1,
        id: initialCheckpoint.id, // Same ID
        ts: initialCheckpoint.ts, // Same timestamp
        channel_values: {
          initialKey: 'updatedValue', // Changed value
          newKey: 'newValue', // Added new key
        },
        channel_versions: {
          version: 2, // Updated version
        },
        versions_seen: {
          seen: {
            initial: 2,
          },
        },
      };

      // Save initial checkpoint
      await saver.put(
        { configurable: { thread_id: THREAD_ID, checkpoint_ns: CHECKPOINT_NS } },
        initialCheckpoint,
        {
          source: 'update',
          step: -1,
          parents: {},
        }
      );

      // Verify initial checkpoint was saved
      const firstTuple = await saver.getTuple({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: CHECKPOINT_NS },
      });
      expect(firstTuple?.checkpoint.channel_values).toEqual({ initialKey: 'initialValue' });

      // Upsert with updated checkpoint (same ID)
      await saver.put(
        { configurable: { thread_id: THREAD_ID, checkpoint_ns: CHECKPOINT_NS } },
        updatedCheckpoint,
        {
          source: 'update',
          step: -1,
          parents: {},
        }
      );

      // Verify checkpoint was updated, not duplicated
      const updatedTuple = await saver.getTuple({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: CHECKPOINT_NS },
      });
      expect(updatedTuple?.checkpoint.channel_values).toEqual({
        initialKey: 'updatedValue',
        newKey: 'newValue',
      });
      expect(updatedTuple?.checkpoint.channel_versions.version).toBe(2);

      // List all checkpoints and verify only one exists
      const checkpointTupleGenerator = saver.list({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: CHECKPOINT_NS },
      });
      const checkpointTuples: CheckpointTuple[] = [];
      for await (const checkpoint of checkpointTupleGenerator) {
        checkpointTuples.push(checkpoint);
      }
      expect(checkpointTuples.length).toBe(1);
      expect(checkpointTuples[0].checkpoint.id).toBe(initialCheckpoint.id);
    });

    it('should upsert writes when calling putWrites multiple times with the same checkpoint_id', async () => {
      const testCheckpoint: Checkpoint = {
        v: 1,
        id: uuid6(-1),
        ts: '2025-07-22T17:42:34.754Z',
        channel_values: {
          someKey: 'someValue',
        },
        channel_versions: {
          version: 1,
        },
        versions_seen: {},
      };

      // Save checkpoint first
      await saver.put(
        { configurable: { thread_id: THREAD_ID, checkpoint_ns: CHECKPOINT_NS } },
        testCheckpoint,
        {
          source: 'update',
          step: -1,
          parents: {},
        }
      );

      // Add first set of writes
      await saver.putWrites(
        {
          configurable: {
            checkpoint_id: testCheckpoint.id,
            checkpoint_ns: CHECKPOINT_NS,
            thread_id: THREAD_ID,
          },
        },
        [['write1', 'data1']],
        'task1'
      );

      // Verify first writes
      const firstTuple = await saver.getTuple({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: CHECKPOINT_NS },
      });
      expect(firstTuple?.pendingWrites).toEqual([['task1', 'write1', 'data1']]);

      // Add second set of writes with same checkpoint_id
      await saver.putWrites(
        {
          configurable: {
            checkpoint_id: testCheckpoint.id,
            checkpoint_ns: CHECKPOINT_NS,
            thread_id: THREAD_ID,
          },
        },
        [['write2', 'data2']],
        'task2'
      );

      // Verify both writes are present
      const secondTuple = await saver.getTuple({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: CHECKPOINT_NS },
      });
      expect(secondTuple?.pendingWrites).toHaveLength(2);
      expect(secondTuple?.pendingWrites).toEqual(
        expect.arrayContaining([
          ['task1', 'write1', 'data1'],
          ['task2', 'write2', 'data2'],
        ])
      );
    });

    it('should handle multiple upserts of the same checkpoint in rapid succession', async () => {
      const checkpointId = uuid6(-1);
      const baseCheckpoint: Checkpoint = {
        v: 1,
        id: checkpointId,
        ts: '2025-07-22T17:42:34.754Z',
        channel_values: {},
        channel_versions: {},
        versions_seen: {},
      };

      // Perform multiple rapid upserts
      const upsertPromises = [];
      for (let i = 0; i < 5; i++) {
        const checkpoint = {
          ...baseCheckpoint,
          channel_values: { counter: i },
        };
        upsertPromises.push(
          saver.put(
            { configurable: { thread_id: THREAD_ID, checkpoint_ns: CHECKPOINT_NS } },
            checkpoint,
            {
              source: 'update',
              step: -1,
              parents: {},
            }
          )
        );
      }

      await Promise.all(upsertPromises);

      // Verify only one checkpoint exists
      const checkpointTupleGenerator = saver.list({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: CHECKPOINT_NS },
      });
      const checkpointTuples: CheckpointTuple[] = [];
      for await (const checkpoint of checkpointTupleGenerator) {
        checkpointTuples.push(checkpoint);
      }
      expect(checkpointTuples.length).toBe(1);
      expect(checkpointTuples[0].checkpoint.id).toBe(checkpointId);
      // The final value should be one of the upserted values
      expect(checkpointTuples[0].checkpoint.channel_values.counter).toBeGreaterThanOrEqual(0);
      expect(checkpointTuples[0].checkpoint.channel_values.counter).toBeLessThanOrEqual(4);
    });

    it('should handle upserts across different namespaces independently', async () => {
      const checkpointId = uuid6(-1);
      const namespace1 = 'namespace-1';
      const namespace2 = 'namespace-2';

      const checkpoint1: Checkpoint = {
        v: 1,
        id: checkpointId,
        ts: '2025-07-22T17:42:34.754Z',
        channel_values: { namespace: 'first' },
        channel_versions: {},
        versions_seen: {},
      };

      const checkpoint2: Checkpoint = {
        v: 1,
        id: checkpointId,
        ts: '2025-07-22T17:42:34.754Z',
        channel_values: { namespace: 'second' },
        channel_versions: {},
        versions_seen: {},
      };

      // Save checkpoint with same ID to different namespaces
      await saver.put(
        { configurable: { thread_id: THREAD_ID, checkpoint_ns: namespace1 } },
        checkpoint1,
        { source: 'update', step: -1, parents: {} }
      );

      await saver.put(
        { configurable: { thread_id: THREAD_ID, checkpoint_ns: namespace2 } },
        checkpoint2,
        { source: 'update', step: -1, parents: {} }
      );

      // Verify both checkpoints exist independently
      const tuple1 = await saver.getTuple({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: namespace1 },
      });
      expect(tuple1?.checkpoint.channel_values).toEqual({ namespace: 'first' });

      const tuple2 = await saver.getTuple({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: namespace2 },
      });
      expect(tuple2?.checkpoint.channel_values).toEqual({ namespace: 'second' });

      // Upsert namespace1 checkpoint
      const updatedCheckpoint1: Checkpoint = {
        ...checkpoint1,
        channel_values: { namespace: 'first-updated' },
      };
      await saver.put(
        { configurable: { thread_id: THREAD_ID, checkpoint_ns: namespace1 } },
        updatedCheckpoint1,
        { source: 'update', step: -1, parents: {} }
      );

      // Verify only namespace1 was updated
      const updatedTuple1 = await saver.getTuple({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: namespace1 },
      });
      expect(updatedTuple1?.checkpoint.channel_values).toEqual({ namespace: 'first-updated' });

      const unchangedTuple2 = await saver.getTuple({
        configurable: { thread_id: THREAD_ID, checkpoint_ns: namespace2 },
      });
      expect(unchangedTuple2?.checkpoint.channel_values).toEqual({ namespace: 'second' });
    });
  });
});
