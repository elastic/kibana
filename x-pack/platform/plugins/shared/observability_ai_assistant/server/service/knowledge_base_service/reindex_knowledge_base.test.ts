/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getCurrentAndNextWriteIndexName } from './reindex_knowledge_base';

describe('getCurrentWriteIndexName', () => {
  let esClient: { asInternalUser: ElasticsearchClient };

  beforeEach(() => {
    esClient = {
      asInternalUser: {
        indices: { getAlias: jest.fn() },
      },
    } as unknown as { asInternalUser: ElasticsearchClient };
  });

  it('should return the current and next write index names', async () => {
    esClient.asInternalUser.indices.getAlias = getMockedResponse(
      '.kibana-observability-ai-assistant-kb-000008'
    );

    expect(await getCurrentAndNextWriteIndexName(esClient)).toEqual({
      currentWriteIndexName: '.kibana-observability-ai-assistant-kb-000008',
      nextWriteIndexName: '.kibana-observability-ai-assistant-kb-000009',
    });
  });

  it('should handle empty indices list', async () => {
    esClient.asInternalUser.indices.getAlias = jest.fn().mockResolvedValue({});

    expect(await getCurrentAndNextWriteIndexName(esClient)).toEqual({
      currentWriteIndexName: undefined,
      nextWriteIndexName: undefined,
    });
  });

  describe('when the index name is not in the expected format', () => {
    it('handles when missing sequence number', async () => {
      esClient.asInternalUser.indices.getAlias = getMockedResponse(
        '.kibana-observability-ai-assistant-kb'
      );

      expect(await getCurrentAndNextWriteIndexName(esClient)).toEqual({
        currentWriteIndexName: undefined,
        nextWriteIndexName: undefined,
      });
    });

    it('handles when sequence number is not a number', async () => {
      esClient.asInternalUser.indices.getAlias = getMockedResponse(
        '.kibana-observability-ai-assistant-kb-foobar'
      );

      expect(await getCurrentAndNextWriteIndexName(esClient)).toEqual({
        currentWriteIndexName: undefined,
        nextWriteIndexName: undefined,
      });
    });
  });
});

function getMockedResponse(indexName: string) {
  return jest.fn().mockResolvedValue({
    [indexName]: {
      aliases: {
        '.kibana-observability-ai-assistant-kb': {
          is_write_index: true,
        },
      },
    },
  });
}
