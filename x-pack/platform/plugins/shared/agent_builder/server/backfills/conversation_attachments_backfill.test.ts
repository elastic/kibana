/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { conversationIndexName } from '../services/conversation/client/storage';
import { runConversationAttachmentsBackfill } from './conversation_attachments_backfill';

const mockExistsIndex = jest.fn();
const mockReconcileMappings = jest.fn();

jest.mock('p-retry', () => ({
  __esModule: true,
  default: (operation: () => Promise<void>) => operation(),
}));

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

describe('runConversationAttachmentsBackfill', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsIndex.mockResolvedValue(true);
    mockReconcileMappings.mockResolvedValue(undefined);
    logger = loggingSystemMock.createLogger();
    esClient = {
      updateByQuery: jest.fn().mockResolvedValue({ task: 'task-1' }),
    } as unknown as jest.Mocked<ElasticsearchClient>;
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
    (esClient.updateByQuery as jest.Mock).mockImplementation(async () => {
      callOrder.push('updateByQuery');
      return { task: 'task-1' };
    });

    await runConversationAttachmentsBackfill(logger, esClient);

    expect(callOrder).toEqual(['reconcileMappings', 'updateByQuery']);
  });

  it('throttles the reindex', async () => {
    await runConversationAttachmentsBackfill(logger, esClient);

    const [request] = (esClient.updateByQuery as jest.Mock).mock.calls[0];
    expect(request.requests_per_second).toBeGreaterThan(0);
  });

  it('does nothing when the conversation index does not exist yet', async () => {
    mockExistsIndex.mockResolvedValue(false);

    await runConversationAttachmentsBackfill(logger, esClient);

    expect(mockReconcileMappings).not.toHaveBeenCalled();
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
  });

  it('propagates a reindex failure so the caller can log it', async () => {
    (esClient.updateByQuery as jest.Mock).mockRejectedValue(new Error('cluster unavailable'));

    await expect(runConversationAttachmentsBackfill(logger, esClient)).rejects.toThrow(
      'cluster unavailable'
    );
  });
});
