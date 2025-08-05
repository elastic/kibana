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

    esClient.index.mockResolvedValueOnce({
      _index: '.integration_knowledge',
      _id: 'test-package',
      _version: 1,
      result: 'created',
    } as any);

    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent,
    });

    expect(esClient.index).toHaveBeenCalledWith({
      index: '.integration_knowledge',
      id: 'test-package',
      body: {
        package_name: 'test-package',
        version: '1.0.0',
        installed_at: expect.any(String),
        knowledge_base_content: knowledgeBaseContent,
      },
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

    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('should not save anything if knowledge base content is null', async () => {
    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: null as any,
    });

    expect(esClient.index).not.toHaveBeenCalled();
  });
});
