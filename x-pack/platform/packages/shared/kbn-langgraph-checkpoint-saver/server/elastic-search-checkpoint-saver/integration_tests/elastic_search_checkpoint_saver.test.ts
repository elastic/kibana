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
import { uuid6 } from '@langchain/langgraph-checkpoint';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');

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
  pending_sends: [],
};

const checkpoint2: Checkpoint = {
  v: 1,
  id: uuid6(1),
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
  pending_sends: [],
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

  async function setupIndices(esClient: ESClient): Promise<void> {
    const exists = await esClient.indices.exists({
      index: ElasticSearchSaver.defaultCheckpointIndex,
    });
    if (!exists) {
      await esClient.indices.create({
        index: ElasticSearchSaver.defaultCheckpointIndex,
        mappings: {
          properties: ElasticSearchSaver.checkpointIndexMapping,
        },
      });
    }

    const existsWrites = await esClient.indices.exists({
      index: ElasticSearchSaver.defaultCheckpointWritesIndex,
    });
    if (!existsWrites) {
      await esClient.indices.create({
        index: ElasticSearchSaver.defaultCheckpointWritesIndex,
        mappings: {
          properties: ElasticSearchSaver.checkpointWritesIndexMapping,
        },
      });
    }
  }

  beforeEach(async () => {
    // Clean up indices before each test
    try {
      await client.indices.delete({
        index: ElasticSearchSaver.defaultCheckpointIndex,
      });
      await client.indices.delete({
        index: ElasticSearchSaver.defaultCheckpointWritesIndex,
      });
    } catch (error) {
      // ignore errors if indices do not exist
    }

    await setupIndices(client);
    // Create a fresh saver for each test
    saver = new ElasticSearchSaver({
      client,
      refreshPolicy: 'wait_for',
      logger: mockLogger,
    });
  });

  afterAll(async () => {
    // Clean up indices
    try {
      await client.indices.delete({
        index: ElasticSearchSaver.defaultCheckpointIndex,
      });
      await client.indices.delete({
        index: ElasticSearchSaver.defaultCheckpointWritesIndex,
      });
    } catch (e) {
      // Ignore errors if indices don't exist
    }

    // Stop the ES server
    await esServer.stop();
  });

  it('should save and retrieve checkpoints correctly', async () => {
    const undefinedCheckpoint = await saver.getTuple({
      configurable: { thread_id: '1' },
    });
    expect(undefinedCheckpoint).toBeUndefined();

    const runnableConfig = await saver.put({ configurable: { thread_id: '1' } }, checkpoint1, {
      source: 'update',
      step: -1,
      writes: null,
      parents: {},
    });
    expect(runnableConfig).toEqual({
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: checkpoint1.id,
      },
    });

    await saver.putWrites(
      {
        configurable: {
          checkpoint_id: checkpoint1.id,
          checkpoint_ns: '',
          thread_id: '1',
        },
      },
      [['test2', 'test3']],
      'test1'
    );

    const firstCheckpointTuple = await saver.getTuple({
      configurable: { thread_id: '1' },
    });

    expect(firstCheckpointTuple?.config).toEqual({
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: checkpoint1.id,
      },
    });
    expect(firstCheckpointTuple?.checkpoint).toEqual(checkpoint1);
    expect(firstCheckpointTuple?.parentConfig).toBeUndefined();
    expect(firstCheckpointTuple?.pendingWrites).toEqual([['test1', 'test2', 'test3']]);

    await saver.put(
      {
        configurable: {
          thread_id: '1',
          checkpoint_id: '2025-07-22T17:41:26.732Z',
        },
      },
      checkpoint2,
      { source: 'update', step: -1, writes: null, parents: {} }
    );

    // verify that parentTs is set and retrieved correctly for second checkpoint
    const secondCheckpointTuple = await saver.getTuple({
      configurable: { thread_id: '1' },
    });
    expect(secondCheckpointTuple?.parentConfig).toEqual({
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '2025-07-22T17:41:26.732Z',
      },
    });

    // list checkpoints
    const checkpointTupleGenerator = saver.list({
      configurable: { thread_id: '1' },
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
  });
});
