/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createStorage } from './storage';

const createLoggerMock = (): Mocked<Logger> => {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    get: vi.fn(),
  } as unknown as Mocked<Logger>;

  logger.get.mockReturnValue(logger);

  return logger;
};

const createMockEsClient = (): Mocked<ElasticsearchClient> => {
  return {
    info: vi.fn().mockResolvedValue({
      version: { build_flavor: 'default' },
    }),
    index: vi.fn().mockResolvedValue({
      _id: 'conversation-1',
      _index: '.kibana-elastic-ai-agent-builder-conversations-000001',
      _shards: { successful: 1 },
      result: 'created',
    }),
    indices: {
      putIndexTemplate: vi.fn().mockResolvedValue({}),
      getAlias: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
  } as unknown as Mocked<ElasticsearchClient>;
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

  it('maps attachments id and type as keyword sub-properties', async () => {
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
        attachments: [],
      },
    });

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: expect.objectContaining({
          mappings: expect.objectContaining({
            properties: expect.objectContaining({
              attachments: expect.objectContaining({
                type: 'object',
                dynamic: false,
                properties: {
                  id: expect.objectContaining({ type: 'keyword' }),
                  type: expect.objectContaining({ type: 'keyword' }),
                },
              }),
            }),
          }),
        }),
      })
    );
  });
});
