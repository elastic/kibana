/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { createIndex } from './create_index';
import { internalElserInferenceId } from '../../../../common';

describe('createIndex', () => {
  let log: MockedLogger;
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    log = loggerMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('calls esClient.indices.create with the right parameters for the current manifest version', async () => {
    const mappings: MappingTypeMapping = {
      properties: {},
    };
    const indexName = '.some-index';

    await createIndex({
      indexName,
      mappings,
      legacySemanticText: false,
      log,
      esClient,
    });

    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    expect(esClient.indices.create).toHaveBeenCalledWith({
      index: indexName,
      mappings,
      settings: {
        auto_expand_replicas: '0-1',
        'index.mapping.semantic_text.use_legacy_format': false,
      },
    });
  });

  it('calls esClient.indices.create with the right parameters for the manifest version 1.0.0', async () => {
    const mappings: MappingTypeMapping = {
      properties: {},
    };
    const indexName = '.some-index';

    await createIndex({
      indexName,
      mappings,
      legacySemanticText: true,
      log,
      esClient,
    });

    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    expect(esClient.indices.create).toHaveBeenCalledWith({
      index: indexName,
      mappings,
      settings: {
        auto_expand_replicas: '0-1',
        'index.mapping.semantic_text.use_legacy_format': true,
      },
    });
  });

  it('calls esClient.indices.create with the right parameters for serverless', async () => {
    const mappings: MappingTypeMapping = {
      properties: {},
    };
    const indexName = '.some-index';

    await createIndex({
      indexName,
      mappings,
      legacySemanticText: true,
      log,
      esClient,
      isServerless: true,
    });

    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    expect(esClient.indices.create).toHaveBeenCalledWith({
      index: indexName,
      mappings,
    });
  });

  it('rewrites the inference_id attribute of semantic_text fields in the mapping', async () => {
    const mappings: MappingTypeMapping = {
      properties: {
        semantic: {
          type: 'semantic_text',
          inference_id: '.elser',
        },
        bool: {
          type: 'boolean',
        },
      },
    };

    await createIndex({
      indexName: '.some-index',
      mappings,
      legacySemanticText: false,
      log,
      esClient,
    });

    expect(esClient.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mappings: {
          properties: {
            semantic: {
              type: 'semantic_text',
              inference_id: internalElserInferenceId,
            },
            bool: {
              type: 'boolean',
            },
          },
        },
      })
    );
  });
});
