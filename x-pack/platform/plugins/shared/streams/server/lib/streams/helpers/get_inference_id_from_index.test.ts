/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { getInferenceIdFromIndex } from './get_inference_id_from_index';

const logger = loggerMock.create();

type MockEsClient = Parameters<typeof getInferenceIdFromIndex>[0] & {
  indices: { getMapping: jest.Mock };
};

function createEsClient(getMappingResponse?: unknown): MockEsClient {
  return {
    indices: {
      getMapping: jest.fn().mockResolvedValue(getMappingResponse ?? {}),
    },
  } as unknown as MockEsClient;
}

describe('getInferenceIdFromIndex', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the inference_id when the semantic_text field has one', async () => {
    const esClient = createEsClient({
      '.kibana_streams_features-000001': {
        mappings: {
          properties: {
            feature: {
              properties: {
                search_embedding: {
                  type: 'semantic_text',
                  inference_id: '.elser-2-elastic',
                },
              },
            },
          },
        },
      },
    });

    const result = await getInferenceIdFromIndex(
      esClient,
      '.kibana_streams_features',
      'feature.search_embedding',
      logger
    );

    expect(result).toBe('.elser-2-elastic');
    expect(esClient.indices.getMapping).toHaveBeenCalledWith({
      index: '.kibana_streams_features',
    });
  });

  it('returns undefined when the field has no explicit inference_id', async () => {
    const esClient = createEsClient({
      '.kibana_streams_features-000001': {
        mappings: {
          properties: {
            feature: {
              properties: {
                search_embedding: {
                  type: 'semantic_text',
                },
              },
            },
          },
        },
      },
    });

    const result = await getInferenceIdFromIndex(
      esClient,
      '.kibana_streams_features',
      'feature.search_embedding',
      logger
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when the index does not exist', async () => {
    const esClient = createEsClient();
    esClient.indices.getMapping.mockRejectedValueOnce(new Error('index_not_found_exception'));

    const result = await getInferenceIdFromIndex(
      esClient,
      '.kibana_streams_features',
      'feature.search_embedding',
      logger
    );

    expect(result).toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Unable to read mapping'));
  });

  it('returns undefined when the field does not exist in the mapping', async () => {
    const esClient = createEsClient({
      '.kibana_streams_features-000001': {
        mappings: {
          properties: {
            feature: {
              properties: {
                title: { type: 'keyword' },
              },
            },
          },
        },
      },
    });

    const result = await getInferenceIdFromIndex(
      esClient,
      '.kibana_streams_features',
      'feature.search_embedding',
      logger
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when the parent object does not exist', async () => {
    const esClient = createEsClient({
      '.kibana_streams_features-000001': {
        mappings: {
          properties: {
            other_field: { type: 'keyword' },
          },
        },
      },
    });

    const result = await getInferenceIdFromIndex(
      esClient,
      '.kibana_streams_features',
      'feature.search_embedding',
      logger
    );

    expect(result).toBeUndefined();
  });

  it('returns undefined when mappings have no properties', async () => {
    const esClient = createEsClient({
      '.kibana_streams_features-000001': {
        mappings: {},
      },
    });

    const result = await getInferenceIdFromIndex(
      esClient,
      '.kibana_streams_features',
      'feature.search_embedding',
      logger
    );

    expect(result).toBeUndefined();
  });

  it('works with query.search_embedding path', async () => {
    const esClient = createEsClient({
      '.kibana_streams_assets-000001': {
        mappings: {
          properties: {
            query: {
              properties: {
                search_embedding: {
                  type: 'semantic_text',
                  inference_id: '.jina-embeddings-v5-text-small',
                },
              },
            },
          },
        },
      },
    });

    const result = await getInferenceIdFromIndex(
      esClient,
      '.kibana_streams_assets',
      'query.search_embedding',
      logger
    );

    expect(result).toBe('.jina-embeddings-v5-text-small');
  });
});
