/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { getCurrentWriteIndexName } from './reindex_knowledge_base';

describe('getCurrentWriteIndexName', () => {
  let esClient: { asInternalUser: ElasticsearchClient };
  let logger: Logger;

  beforeEach(() => {
    esClient = {
      asInternalUser: {
        cat: { indices: jest.fn() },
      },
    } as unknown as { asInternalUser: ElasticsearchClient };

    logger = {
      info: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;
  });

  it('should return the current and next write index names', async () => {
    esClient.asInternalUser.cat.indices = jest
      .fn()
      .mockResolvedValue([{ index: '.kibana-observability-ai-assistant-kb-000008' }]);

    expect(
      await getCurrentWriteIndexName({
        logger,
        esClient,
      })
    ).toEqual({
      currentWriteIndexName: '.kibana-observability-ai-assistant-kb-000008',
      nextWriteIndexName: '.kibana-observability-ai-assistant-kb-000009',
    });
  });

  it('should handle empty indices list', async () => {
    esClient.asInternalUser.cat.indices = jest.fn().mockResolvedValue([]);

    expect(
      await getCurrentWriteIndexName({
        logger,
        esClient,
      })
    ).toEqual({ currentWriteIndexName: undefined, nextWriteIndexName: undefined });
  });
});
