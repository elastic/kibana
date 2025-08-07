/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { KnowledgeBaseItem } from '../../../../common/types';

import {
  INTEGRATION_KNOWLEDGE_INDEX,
  INTEGRATION_KNOWLEDGE_INDEX_TEMPLATE,
  ensureIntegrationKnowledgeIndex,
  saveKnowledgeBaseContentToIndex,
  getPackageKnowledgeBaseFromIndex,
  deletePackageKnowledgeBase,
  updatePackageKnowledgeBaseVersion,
} from './knowledge_base_index';

describe('knowledge_base_index', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.clearAllMocks();
  });

  describe('INTEGRATION_KNOWLEDGE_INDEX_TEMPLATE', () => {
    it('should have correct structure', () => {
      expect(INTEGRATION_KNOWLEDGE_INDEX_TEMPLATE).toEqual({
        index_patterns: ['.integration_knowledge*'],
        template: {
          settings: {
            'index.hidden': true,
          },
          mappings: {
            properties: {
              filename: { type: 'keyword' },
              content: { type: 'semantic_text' },
              version: { type: 'version' },
              package_name: { type: 'keyword' },
            },
          },
        },
        _meta: {
          description: 'Integration package knowledge base content storage',
          managed: true,
        },
      });
    });
  });

  describe('ensureIntegrationKnowledgeIndex', () => {
    it('should create index template and index when they do not exist', async () => {
      (mockEsClient.indices.existsIndexTemplate as jest.Mock).mockResolvedValue(false);
      (mockEsClient.indices.exists as jest.Mock).mockResolvedValue(false);

      await ensureIntegrationKnowledgeIndex(mockEsClient);

      expect(mockEsClient.indices.existsIndexTemplate).toHaveBeenCalledWith({
        name: 'integration-knowledge-template',
      });

      expect(mockEsClient.indices.putIndexTemplate).toHaveBeenCalledWith({
        name: 'integration-knowledge-template',
        ...INTEGRATION_KNOWLEDGE_INDEX_TEMPLATE,
      });

      expect(mockEsClient.indices.exists).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
      });

      expect(mockEsClient.indices.create).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        settings: INTEGRATION_KNOWLEDGE_INDEX_TEMPLATE.template.settings,
        mappings: INTEGRATION_KNOWLEDGE_INDEX_TEMPLATE.template.mappings,
      });
    });

    it('should not create template when it already exists', async () => {
      (mockEsClient.indices.existsIndexTemplate as jest.Mock).mockResolvedValue(true);
      (mockEsClient.indices.exists as jest.Mock).mockResolvedValue(false);

      await ensureIntegrationKnowledgeIndex(mockEsClient);

      expect(mockEsClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(mockEsClient.indices.create).toHaveBeenCalled();
    });

    it('should not create index when it already exists', async () => {
      (mockEsClient.indices.existsIndexTemplate as jest.Mock).mockResolvedValue(true);
      (mockEsClient.indices.exists as jest.Mock).mockResolvedValue(true);

      await ensureIntegrationKnowledgeIndex(mockEsClient);

      expect(mockEsClient.indices.putIndexTemplate).not.toHaveBeenCalled();
      expect(mockEsClient.indices.create).not.toHaveBeenCalled();
    });

    it('should throw error when ES operations fail', async () => {
      const errorMessage = 'Elasticsearch error';
      (mockEsClient.indices.existsIndexTemplate as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      await expect(ensureIntegrationKnowledgeIndex(mockEsClient)).rejects.toThrow(
        `Failed to ensure integration knowledge index: ${errorMessage}`
      );
    });
  });

  describe('saveKnowledgeBaseContentToIndex', () => {
    const mockKnowledgeBaseContent: KnowledgeBaseItem[] = [
      {
        filename: 'test1.md',
        content: 'Test content 1',
      },
      {
        filename: 'test2.md',
        content: 'Test content 2',
      },
    ];

    beforeEach(() => {
      (mockEsClient.indices.existsIndexTemplate as jest.Mock).mockResolvedValue(true);
      (mockEsClient.indices.exists as jest.Mock).mockResolvedValue(true);
    });

    it('should save knowledge base content successfully', async () => {
      await saveKnowledgeBaseContentToIndex({
        esClient: mockEsClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: mockKnowledgeBaseContent,
      });

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
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

      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _index: INTEGRATION_KNOWLEDGE_INDEX, _id: 'test-package-test1.md' } },
          {
            package_name: 'test-package',
            filename: 'test1.md',
            content: 'Test content 1',
            version: '1.0.0',
          },
          { index: { _index: INTEGRATION_KNOWLEDGE_INDEX, _id: 'test-package-test2.md' } },
          {
            package_name: 'test-package',
            filename: 'test2.md',
            content: 'Test content 2',
            version: '1.0.0',
          },
        ],
        refresh: 'wait_for',
      });
    });

    it('should return early when no knowledge base content provided', async () => {
      await saveKnowledgeBaseContentToIndex({
        esClient: mockEsClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: [],
      });

      expect(mockEsClient.deleteByQuery).not.toHaveBeenCalled();
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should return early when knowledge base content is undefined', async () => {
      await saveKnowledgeBaseContentToIndex({
        esClient: mockEsClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: undefined as any,
      });

      expect(mockEsClient.deleteByQuery).not.toHaveBeenCalled();
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });
  });

  describe('getPackageKnowledgeBaseFromIndex', () => {
    const mockSearchResponse = {
      hits: {
        hits: [
          {
            _source: {
              filename: 'test1.md',
              content: 'Test content 1',
              package_name: 'test-package',
              version: '1.0.0',
            },
          },
          {
            _source: {
              filename: 'test2.md',
              content: 'Test content 2',
              package_name: 'test-package',
              version: '1.0.0',
            },
          },
        ],
      },
    };

    it('should retrieve knowledge base content by package name only', async () => {
      (mockEsClient.search as jest.Mock).mockResolvedValue(mockSearchResponse as any);

      const result = await getPackageKnowledgeBaseFromIndex(mockEsClient, 'test-package');

      expect(mockEsClient.search).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        query: {
          term: { 'package_name.keyword': 'test-package' },
        },
        sort: [{ filename: 'asc' }],
        size: 1000,
      });

      expect(result).toEqual([
        {
          filename: 'test1.md',
          content: 'Test content 1',
          path: 'docs/knowledge_base/test1.md',
        },
        {
          filename: 'test2.md',
          content: 'Test content 2',
          path: 'docs/knowledge_base/test2.md',
        },
      ]);
    });

    it('should retrieve knowledge base content by package name and version', async () => {
      (mockEsClient.search as jest.Mock).mockResolvedValue(mockSearchResponse as any);

      const result = await getPackageKnowledgeBaseFromIndex(mockEsClient, 'test-package', '1.0.0');

      expect(mockEsClient.search).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        query: {
          bool: {
            must: [
              { term: { 'package_name.keyword': 'test-package' } },
              { term: { version: '1.0.0' } },
            ],
          },
        },
        sort: [{ filename: 'asc' }],
        size: 1000,
      });

      expect(result).toEqual([
        {
          filename: 'test1.md',
          content: 'Test content 1',
          path: 'docs/knowledge_base/test1.md',
        },
        {
          filename: 'test2.md',
          content: 'Test content 2',
          path: 'docs/knowledge_base/test2.md',
        },
      ]);
    });

    it('should return empty array when index not found', async () => {
      const notFoundError = new Error('Index not found');
      (notFoundError as any).statusCode = 404;
      (mockEsClient.search as jest.Mock).mockRejectedValue(notFoundError);

      const result = await getPackageKnowledgeBaseFromIndex(mockEsClient, 'test-package');

      expect(result).toEqual([]);
    });

    it('should throw error for non-404 errors', async () => {
      const serverError = new Error('Server error');
      (serverError as any).statusCode = 500;
      (mockEsClient.search as jest.Mock).mockRejectedValue(serverError);

      await expect(getPackageKnowledgeBaseFromIndex(mockEsClient, 'test-package')).rejects.toThrow(
        'Server error'
      );
    });
  });

  describe('deletePackageKnowledgeBase', () => {
    it('should delete by package name only', async () => {
      await deletePackageKnowledgeBase(mockEsClient, 'test-package');

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        query: {
          term: { 'package_name.keyword': 'test-package' },
        },
        refresh: true,
      });
    });

    it('should delete by package name and version', async () => {
      await deletePackageKnowledgeBase(mockEsClient, 'test-package', '1.0.0');

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
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
    });
  });

  describe('updatePackageKnowledgeBaseVersion', () => {
    const mockKnowledgeBaseContent: KnowledgeBaseItem[] = [
      {
        filename: 'updated.md',
        content: 'Updated content',
      },
    ];

    beforeEach(() => {
      (mockEsClient.indices.existsIndexTemplate as jest.Mock).mockResolvedValue(true);
      (mockEsClient.indices.exists as jest.Mock).mockResolvedValue(true);
    });

    it('should update package knowledge base with new version', async () => {
      await updatePackageKnowledgeBaseVersion({
        esClient: mockEsClient,
        pkgName: 'test-package',
        oldVersion: '1.0.0',
        newVersion: '2.0.0',
        knowledgeBaseContent: mockKnowledgeBaseContent,
      });

      // Should delete all existing content for the package
      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        query: {
          term: { 'package_name.keyword': 'test-package' },
        },
        refresh: true,
      });

      // Should index new content with new version
      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _index: INTEGRATION_KNOWLEDGE_INDEX, _id: 'test-package-updated.md' } },
          {
            package_name: 'test-package',
            filename: 'updated.md',
            content: 'Updated content',
            version: '2.0.0',
          },
        ],
        refresh: 'wait_for',
      });
    });

    it('should handle fresh install without old version', async () => {
      await updatePackageKnowledgeBaseVersion({
        esClient: mockEsClient,
        pkgName: 'test-package',
        newVersion: '1.0.0',
        knowledgeBaseContent: mockKnowledgeBaseContent,
      });

      // Should still delete all existing content for the package (fresh install case)
      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        query: {
          term: { 'package_name.keyword': 'test-package' },
        },
        refresh: true,
      });

      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _index: INTEGRATION_KNOWLEDGE_INDEX, _id: 'test-package-updated.md' } },
          {
            package_name: 'test-package',
            filename: 'updated.md',
            content: 'Updated content',
            version: '1.0.0',
          },
        ],
        refresh: 'wait_for',
      });
    });

    it('should only delete when no knowledge base content provided', async () => {
      await updatePackageKnowledgeBaseVersion({
        esClient: mockEsClient,
        pkgName: 'test-package',
        oldVersion: '1.0.0',
        newVersion: '2.0.0',
        knowledgeBaseContent: [],
      });

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        query: {
          term: { 'package_name.keyword': 'test-package' },
        },
        refresh: true,
      });

      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });

    it('should handle undefined knowledge base content', async () => {
      await updatePackageKnowledgeBaseVersion({
        esClient: mockEsClient,
        pkgName: 'test-package',
        oldVersion: '1.0.0',
        newVersion: '2.0.0',
        knowledgeBaseContent: undefined as any,
      });

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        query: {
          term: { 'package_name.keyword': 'test-package' },
        },
        refresh: true,
      });

      expect(mockEsClient.bulk).not.toHaveBeenCalled();
    });
  });
});
