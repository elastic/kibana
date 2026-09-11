/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesGetAliasResponse,
  IndicesGetFieldMappingResponse,
  TasksTaskInfo,
} from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { conversationIndexName } from '../services/conversation/client/storage';
import { runConversationAttachmentsBackfill } from './conversation_attachments_backfill';

const mockExistsIndex = jest.fn();
const mockReconcileMappings = jest.fn();

jest.mock('p-retry', () => {
  class AbortError extends Error {}
  const pRetry = (operation: () => Promise<unknown>) => operation();
  pRetry.AbortError = AbortError;

  return { __esModule: true, default: pRetry };
});

jest.mock('../services/conversation/client/storage', () => {
  const actual = jest.requireActual('../services/conversation/client/storage');

  return {
    ...actual,
    createStorage: () => ({
      getClient: () => ({
        existsIndex: mockExistsIndex,
        reconcileMappings: mockReconcileMappings,
      }),
    }),
  };
});

const writeIndex = `${conversationIndexName}-000001`;
const otherIndex = `${conversationIndexName}-000002`;

const aliasResponse: IndicesGetAliasResponse = {
  [writeIndex]: { aliases: { [conversationIndexName]: { is_write_index: true } } },
};

const unmappedResponse: IndicesGetFieldMappingResponse = {
  [writeIndex]: { mappings: {} },
};

const mappedResponse: IndicesGetFieldMappingResponse = {
  [writeIndex]: {
    mappings: {
      'attachments.id': {
        full_name: 'attachments.id',
        mapping: { id: { type: 'keyword' } },
      },
    },
  },
};

const taskInfo: TasksTaskInfo = {
  action: 'indices:data/write/update/byquery',
  cancellable: true,
  headers: {},
  id: 1,
  node: 'node-1',
  running_time_in_nanos: 1,
  start_time_in_millis: 1,
  type: 'transport',
};

describe('runConversationAttachmentsBackfill', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsIndex.mockResolvedValue(true);
    mockReconcileMappings.mockResolvedValue(undefined);
    logger = loggingSystemMock.createLogger();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.getAlias.mockResolvedValue(aliasResponse);
    esClient.indices.getFieldMapping.mockResolvedValue(unmappedResponse);
    esClient.updateByQuery.mockResolvedValue({ task: 'task-1' });
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: taskInfo,
      response: { total: 3, updated: 3, version_conflicts: 0, failures: [] },
    });
  });

  it('reindexes conversations that have no indexed attachment ids', async () => {
    await runConversationAttachmentsBackfill(logger, esClient);

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: conversationIndexName,
        conflicts: 'proceed',
        wait_for_completion: false,
        query: {
          bool: {
            must_not: [{ exists: { field: 'attachments.id' } }],
          },
        },
      })
    );
  });

  it('applies the mapping update before reindexing', async () => {
    const callOrder: string[] = [];
    mockReconcileMappings.mockImplementation(async () => {
      callOrder.push('reconcileMappings');
    });
    esClient.updateByQuery.mockImplementation(async () => {
      callOrder.push('updateByQuery');
      return { task: 'task-1' };
    });

    await runConversationAttachmentsBackfill(logger, esClient);

    expect(callOrder).toEqual(['reconcileMappings', 'updateByQuery']);
  });

  it('throttles the reindex', async () => {
    await runConversationAttachmentsBackfill(logger, esClient);

    const [request] = esClient.updateByQuery.mock.calls[0];
    expect(request.requests_per_second).toBeGreaterThan(0);
  });

  it('does nothing when the conversation index does not exist yet', async () => {
    mockExistsIndex.mockResolvedValue(false);

    await runConversationAttachmentsBackfill(logger, esClient);

    expect(mockReconcileMappings).not.toHaveBeenCalled();
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });

  it('does nothing once attachments are mapped, so restarts do not re-sweep the index', async () => {
    esClient.indices.getFieldMapping.mockResolvedValue(mappedResponse);

    await runConversationAttachmentsBackfill(logger, esClient);

    expect(mockReconcileMappings).not.toHaveBeenCalled();
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });

  it('scopes the mapping check to the write index, the only index reconcileMappings updates', async () => {
    esClient.indices.getAlias.mockResolvedValue({
      ...aliasResponse,
      [otherIndex]: { aliases: { [conversationIndexName]: { is_write_index: false } } },
    });
    esClient.indices.getFieldMapping.mockResolvedValue(mappedResponse);

    await runConversationAttachmentsBackfill(logger, esClient);

    expect(esClient.indices.getFieldMapping).toHaveBeenCalledWith(
      expect.objectContaining({ index: writeIndex })
    );
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });

  it('skips and warns when the alias has no write index', async () => {
    esClient.indices.getAlias.mockResolvedValue({
      [writeIndex]: { aliases: { [conversationIndexName]: {} } },
    });

    await runConversationAttachmentsBackfill(logger, esClient);

    expect(esClient.updateByQuery).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no write index'));
  });

  it('reports the outcome of the elasticsearch task rather than dropping it', async () => {
    await runConversationAttachmentsBackfill(logger, esClient);

    expect(esClient.tasks.get).toHaveBeenCalledWith(expect.objectContaining({ task_id: 'task-1' }));
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('3 of 3 conversation(s) re-indexed')
    );
  });

  it('logs an error when the elasticsearch task reports document failures', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: taskInfo,
      response: { total: 3, updated: 1, failures: [{ id: 'conversation-1' }] },
    });

    await runConversationAttachmentsBackfill(logger, esClient);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('1 document(s) could not be re-indexed')
    );
  });

  it('logs an error when elasticsearch reports the task itself failed', async () => {
    esClient.tasks.get.mockResolvedValue({
      completed: true,
      task: taskInfo,
      error: { type: 'search_phase_execution_exception', reason: 'all shards failed' },
    });

    await runConversationAttachmentsBackfill(logger, esClient);

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('all shards failed'));
  });

  it('propagates a reindex failure so the caller can log it', async () => {
    esClient.updateByQuery.mockRejectedValue(new Error('cluster unavailable'));

    await expect(runConversationAttachmentsBackfill(logger, esClient)).rejects.toThrow(
      'cluster unavailable'
    );
  });
});
