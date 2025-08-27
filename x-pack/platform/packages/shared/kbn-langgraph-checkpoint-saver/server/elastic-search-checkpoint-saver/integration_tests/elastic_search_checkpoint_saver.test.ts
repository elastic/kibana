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
import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';
import { Subject } from 'rxjs';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { uuid6 } from '@langchain/langgraph-checkpoint';

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
  pending_sends: [],
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
    // Set up checkpoints data stream
    const defaultCheckpointDatastream = new DataStreamSpacesAdapter('checkpoints', {
      kibanaVersion: '9.1.0',
      totalFieldsLimit: 2500,
    });

    defaultCheckpointDatastream.setComponentTemplate({
      name: `component-template-checkpoints`,
      fieldMap: ElasticSearchSaver.checkpointsFieldMap,
    });

    defaultCheckpointDatastream.setIndexTemplate({
      name: `checkpoints`,
      componentTemplateRefs: [`component-template-checkpoints`],
    });

    defaultCheckpointDatastream.install({
      esClient,
      logger: mockLogger,
      pluginStop$: new Subject<void>(),
    });

    await defaultCheckpointDatastream.installSpace(DEFAULT_NAMESPACE_STRING);

    // Set up checkpoints-writes data stream
    const defaultCheckpointWritesDataStream = new DataStreamSpacesAdapter('checkpoints-writes', {
      kibanaVersion: '9.1.0',
      totalFieldsLimit: 2500,
    });

    defaultCheckpointWritesDataStream.setComponentTemplate({
      name: `component-template-checkpoints-writes`,
      fieldMap: ElasticSearchSaver.checkpointWritesFieldMap,
    });

    defaultCheckpointWritesDataStream.setIndexTemplate({
      name: `checkpoints-writes`,
      componentTemplateRefs: [`component-template-checkpoints-writes`],
    });

    defaultCheckpointWritesDataStream.install({
      esClient,
      logger: mockLogger,
      pluginStop$: new Subject<void>(),
    });

    await defaultCheckpointWritesDataStream.installSpace(DEFAULT_NAMESPACE_STRING);
  }

  async function deleteDataStream(dataStreamName: string) {
    try {
      // Check if the data stream exists using a safe approach
      const exists = await client.indices
        .getDataStream({
          name: dataStreamName,
          error_trace: false,
        })
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        console.log(`Data stream ${dataStreamName} not found`);
        return;
      }

      // Delete the entire data stream (which also deletes all backing indices)
      await client.indices.deleteDataStream({
        name: dataStreamName,
        expand_wildcards: 'all',
      });

      console.log(`Data stream ${dataStreamName} deleted successfully`);
    } catch (err) {
      console.error(`Error deleting data stream ${dataStreamName}:`, err);
    }
  }

  beforeEach(async () => {
    // Clean up indices before each test
    await deleteDataStream('checkpoints*');
    await deleteDataStream('checkpoints-writes*');

    // Re-setup indices for each test
    await setupIndices(client);

    // Create a fresh saver for each test
    saver = new ElasticSearchSaver({
      client,
      refreshPolicy: 'wait_for',
      logger: mockLogger,
      checkpointIndex: `${ElasticSearchSaver.defaultCheckpointIndex}-${DEFAULT_NAMESPACE_STRING}`,
      checkpointWritesIndex: `${ElasticSearchSaver.defaultCheckpointWritesIndex}-${DEFAULT_NAMESPACE_STRING}`,
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
          writes: null,
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
        { source: 'update', step: -1, writes: null, parents: {} }
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
});
