/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import { saveKnowledgeBaseContentToIndex } from '../../knowledge_base_index';

let esClient: jest.Mocked<ElasticsearchClient>;

describe('saveKnowledgeBaseContent', () => {
  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.clearAllMocks();
  });

  it('should save knowledge base content to the system index', async () => {
    const knowledgeBaseContent = [
      {
        filename: 'test-guide.md',
        content: '# Test Guide\n\nThis is a test knowledge base document.',
      },
      {
        filename: 'troubleshooting.md',
        content: '# Troubleshooting\n\nCommon issues and solutions.',
      },
    ];

    // Mock the methods that are actually called by saveKnowledgeBaseContentToIndex
    (esClient.indices.existsIndexTemplate as jest.Mock).mockResolvedValueOnce(true);
    (esClient.indices.exists as jest.Mock).mockResolvedValueOnce(true);
    esClient.deleteByQuery.mockResolvedValueOnce({} as any);
    esClient.bulk.mockResolvedValueOnce({
      took: 1,
      errors: false,
      items: [],
    } as any);

    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent,
    });

    // Verify that deleteByQuery was called to clean up existing documents
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: '.integration_knowledge',
      query: {
        bool: {
          must: [
            { term: { 'package_name.keyword': 'test-package' } },
            { term: { version: '1.0.0' } },
          ],
        },
      },
      refresh: true,
    });

    // Verify that bulk was called with the correct operations
    expect(esClient.bulk).toHaveBeenCalledWith({
      operations: [
        { index: { _index: '.integration_knowledge', _id: 'test-package-test-guide.md' } },
        {
          package_name: 'test-package',
          filename: 'test-guide.md',
          content: '# Test Guide\n\nThis is a test knowledge base document.',
          version: '1.0.0',
        },
        { index: { _index: '.integration_knowledge', _id: 'test-package-troubleshooting.md' } },
        {
          package_name: 'test-package',
          filename: 'troubleshooting.md',
          content: '# Troubleshooting\n\nCommon issues and solutions.',
          version: '1.0.0',
        },
      ],
      refresh: 'wait_for',
    });
  });

  it('should not save anything if knowledge base content is empty', async () => {
    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: [],
    });

    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('should not save anything if knowledge base content is null', async () => {
    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: null as any,
    });

    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
  });
});
