/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  Collector,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { createCollectorFetchContextMock } from '@kbn/usage-collection-plugin/server/mocks';
import type { CoreSetup } from '@kbn/core/server';
import { registerUsageCollector } from './usage';

describe('observability_ai_assistant usage collector', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let collector: Collector<unknown>;
  let usageCollectionMock: ReturnType<typeof createUsageCollectionSetupMock>;
  let mockCoreSetup: jest.Mocked<CoreSetup>;
  let mockEsClient: any;
  const mockedFetchContext = createCollectorFetchContextMock();

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    usageCollectionMock = createUsageCollectionSetupMock();

    mockEsClient = {
      search: jest.fn(),
    };

    mockCoreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        {
          elasticsearch: {
            client: {
              asInternalUser: mockEsClient,
            },
          },
        },
      ]),
    } as any;

    usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
      collector = new Collector(logger, config);
      return createUsageCollectionSetupMock().makeUsageCollector(config);
    });

    registerUsageCollector(usageCollectionMock, mockCoreSetup);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('registers the collector with usageCollection', () => {
    expect(collector).not.toBeUndefined();
    expect(collector.type).toBe('observability_ai_assistant');
    expect(usageCollectionMock.makeUsageCollector).toHaveBeenCalledTimes(1);
    expect(usageCollectionMock.registerCollector).toHaveBeenCalledTimes(1);
  });

  describe('isReady', () => {
    it('returns true', () => {
      expect(collector.isReady()).toBe(true);
    });
  });

  describe('fetch', () => {
    it('returns usage data with all metrics', async () => {
      mockEsClient.search.mockResolvedValueOnce({
        aggregations: {
          any_entries: { value: 15 },
          global_entries: { unique_users: { value: 10 } },
          global_entries_user_created: { unique_users: { value: 8 } },
          global_entries_assistant_created: { unique_users: { value: 2 } },
          private_entries: { unique_users: { value: 5 } },
          private_entries_user_created: { unique_users: { value: 4 } },
          private_entries_assistant_created: { unique_users: { value: 1 } },
          user_instructions: { unique_users: { value: 3 } },
        },
      });

      mockEsClient.search.mockResolvedValueOnce({
        aggregations: {
          archived: { unique_users: { value: 8 } },
          private: { unique_users: { value: 12 } },
          shared: { unique_users: { value: 4 } },
        },
      });

      const result = await collector.fetch(mockedFetchContext);

      expect(result).toEqual({
        knowledge_base: {
          users_with_any_entries: 15,
          users_with_global_entries: 10,
          users_with_global_entries_user_created: 8,
          users_with_global_entries_assistant_created: 2,
          users_with_private_entries: 5,
          users_with_private_entries_user_created: 4,
          users_with_private_entries_assistant_created: 1,
          users_with_user_instructions: 3,
        },
        conversations: {
          users_with_archived_conversations: 8,
          users_with_private_conversations: 12,
          users_with_shared_conversations: 4,
        },
      });
    });

    it('queries both KB and conversations indices', async () => {
      mockEsClient.search.mockResolvedValue({
        aggregations: {
          any_entries: { value: 0 },
          global_entries: { unique_users: { value: 0 } },
          global_entries_user_created: { unique_users: { value: 0 } },
          global_entries_assistant_created: { unique_users: { value: 0 } },
          private_entries: { unique_users: { value: 0 } },
          private_entries_user_created: { unique_users: { value: 0 } },
          private_entries_assistant_created: { unique_users: { value: 0 } },
          user_instructions: { unique_users: { value: 0 } },
          archived: { unique_users: { value: 0 } },
          private: { unique_users: { value: 0 } },
          shared: { unique_users: { value: 0 } },
        },
      });

      await collector.fetch(mockedFetchContext);

      expect(mockEsClient.search).toHaveBeenCalledTimes(2);
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.kibana-observability-ai-assistant-kb*',
        })
      );
      expect(mockEsClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: '.kibana-observability-ai-assistant-conversations*',
        })
      );
    });

    it('returns zeros when aggregations are missing (index does not exist)', async () => {
      // Simulate what ES returns when index doesn't exist
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
        // No aggregations key - happens when wildcard matches no indices
      });

      // No aggregations key
      mockEsClient.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0, relation: 'eq' } },
      });

      const result = await collector.fetch(mockedFetchContext);

      expect(result).toEqual({
        knowledge_base: {
          users_with_any_entries: 0,
          users_with_global_entries: 0,
          users_with_global_entries_user_created: 0,
          users_with_global_entries_assistant_created: 0,
          users_with_private_entries: 0,
          users_with_private_entries_user_created: 0,
          users_with_private_entries_assistant_created: 0,
          users_with_user_instructions: 0,
        },
        conversations: {
          users_with_archived_conversations: 0,
          users_with_private_conversations: 0,
          users_with_shared_conversations: 0,
        },
      });
    });
  });
});
