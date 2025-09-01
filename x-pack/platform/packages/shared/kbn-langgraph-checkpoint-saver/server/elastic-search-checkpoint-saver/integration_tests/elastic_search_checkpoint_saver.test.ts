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
import { Subject } from 'rxjs';
import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import { uuid6 } from '@langchain/langgraph-checkpoint';
import { IndexPatternAdapter } from '@kbn/index-adapter';

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
    // Set up checkpoints index
    const defaultCheckpointIndex = new IndexPatternAdapter('checkpoints', {
      kibanaVersion: '9.2.0',
      totalFieldsLimit: 2500,
    });

    defaultCheckpointIndex.setComponentTemplate({
      name: `component-template-checkpoints`,
      fieldMap: ElasticSearchSaver.checkpointsFieldMap,
    });

    defaultCheckpointIndex.setIndexTemplate({
      name: `checkpoints`,
      componentTemplateRefs: [`component-template-checkpoints`],
    });

    defaultCheckpointIndex.install({
      esClient,
      logger: mockLogger,
      pluginStop$: new Subject<void>(),
    });

    await defaultCheckpointIndex.createIndex(DEFAULT_NAMESPACE_STRING);

    // Set up checkpoint-writes index
    const defaultCheckpointWritesIndex = new IndexPatternAdapter('checkpoint-writes', {
      kibanaVersion: '9.2.0',
      totalFieldsLimit: 2500,
    });

    defaultCheckpointWritesIndex.setComponentTemplate({
      name: `component-template-checkpoint-writes`,
      fieldMap: ElasticSearchSaver.checkpointWritesFieldMap,
    });

    defaultCheckpointWritesIndex.setIndexTemplate({
      name: `checkpoint-writes`,
      componentTemplateRefs: [`component-template-checkpoint-writes`],
    });

    defaultCheckpointWritesIndex.install({
      esClient,
      logger: mockLogger,
      pluginStop$: new Subject<void>(),
    });

    await defaultCheckpointWritesIndex.createIndex(DEFAULT_NAMESPACE_STRING);
  }

  async function deleteIndices(indexPattern: string) {
    try {
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
        console.log(`No indices matching pattern ${indexPattern} found`);
        return;
      }

      // Delete indices by their specific names
      await client.indices.delete({
        index: indexNames.join(','),
        allow_no_indices: true,
      });

      console.log(`Indices ${indexNames.join(', ')} deleted successfully`);
    } catch (err) {
      // If the error is about no indices found, that's okay
      if (err.message?.includes('index_not_found_exception') || err.message?.includes('404')) {
        console.log(`No indices matching pattern ${indexPattern} found`);
        return;
      }
      console.error(`Error deleting indices matching pattern ${indexPattern}:`, err);
    }
  }

  beforeEach(async () => {
    // Clean up indices before each test
    await deleteIndices('checkpoints*');
    await deleteIndices('checkpoint-writes*');

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
