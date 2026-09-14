/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createStorage } from './storage';

const createLoggerMock = (): jest.Mocked<Logger> => {
  const logger = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    get: jest.fn(),
  } as unknown as jest.Mocked<Logger>;

  logger.get.mockReturnValue(logger);

  return logger;
};

const createMockEsClient = (): jest.Mocked<ElasticsearchClient> => {
  return {
    info: jest.fn().mockResolvedValue({
      version: { build_flavor: 'default' },
    }),
    index: jest.fn().mockResolvedValue({
      _id: 'conversation-1',
      _index: '.kibana-elastic-ai-agent-builder-conversations-000001',
      _shards: { successful: 1 },
      result: 'created',
    }),
    indices: {
      putIndexTemplate: jest.fn().mockResolvedValue({}),
      getAlias: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
  } as unknown as jest.Mocked<ElasticsearchClient>;
};

describe('conversation storage mapping', () => {
  it.each(['read_by', 'pinned_by'] as const)('maps %s as a nested field', async (field) => {
    const esClient = createMockEsClient();
    const storage = createStorage({ logger: createLoggerMock(), esClient });

    await storage.getClient().index({
      id: 'conversation-1',
      document: {
        user_name: 'User',
        agent_id: 'agent-1',
        space: 'default',
        title: 'Conversation',
        created_at: '2026-08-24T00:00:00.000Z',
        updated_at: '2026-08-24T00:00:00.000Z',
        conversation_rounds: [],
        [field]: [{ userId: 'user-1' }],
      },
    });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({
          mappings: expect.objectContaining({
            properties: expect.objectContaining({
              [field]: expect.objectContaining({
                type: 'nested',
                dynamic: false,
                properties: expect.objectContaining({
                  userId: expect.objectContaining({
                    type: 'keyword',
                  }),
                }),
              }),
            }),
          }),
        }),
      })
    );
  });
});
