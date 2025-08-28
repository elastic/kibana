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
  saveKnowledgeBaseContentToIndex,
  getPackageKnowledgeBaseFromIndex,
  deletePackageKnowledgeBase,
} from './knowledge_base_index';

// Mock the app context service
jest.mock('../../app_context', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

describe('knowledge_base_index', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;

  beforeEach(() => {
    mockEsClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.clearAllMocks();
  });

  describe('saveKnowledgeBaseContentToIndex', () => {
    const mockKnowledgeBaseContent: KnowledgeBaseItem[] = [
      {
        fileName: 'test1.md',
        content: 'Test content 1',
      },
      {
        fileName: 'test2.md',
        content: 'Test content 2',
      },
    ];

    beforeEach(() => {
      (mockEsClient.indices.existsIndexTemplate as jest.Mock).mockResolvedValue(true);
      (mockEsClient.indices.exists as jest.Mock).mockResolvedValue(true);
    });

    it('should save knowledge base content successfully', async () => {
      const beforeCall = new Date().toISOString();

      // Mock the bulk response to return document IDs
      mockEsClient.bulk.mockResolvedValue({
        items: [
          { index: { _id: 'generated-id-1', status: 201 } },
          { index: { _id: 'generated-id-2', status: 201 } },
        ],
      } as any);

      const result = await saveKnowledgeBaseContentToIndex({
        esClient: mockEsClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: mockKnowledgeBaseContent,
      });

      const afterCall = new Date().toISOString();

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: `${INTEGRATION_KNOWLEDGE_INDEX}*`,
        query: {
          match: { package_name: 'test-package' },
        },
      });

      expect(mockEsClient.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _index: INTEGRATION_KNOWLEDGE_INDEX, _id: expect.any(String) } },
          {
            package_name: 'test-package',
            filename: 'test1.md',
            content: 'Test content 1',
            version: '1.0.0',
            installed_at: expect.any(String),
          },
          { index: { _index: INTEGRATION_KNOWLEDGE_INDEX, _id: expect.any(String) } },
          {
            package_name: 'test-package',
            filename: 'test2.md',
            content: 'Test content 2',
            version: '1.0.0',
            installed_at: expect.any(String),
          },
        ],
        refresh: 'wait_for',
      });

      // Verify the function returns the document IDs
      expect(result).toEqual(['generated-id-1', 'generated-id-2']);

      // Verify the document IDs used in bulk operation are generated
      const bulkCall = (mockEsClient.bulk as jest.Mock).mock.calls[0][0];
      const bulkId1 = bulkCall.operations[0].index._id;
      const bulkId2 = bulkCall.operations[2].index._id;

      expect(bulkId1).toBeDefined();
      expect(bulkId2).toBeDefined();
      expect(typeof bulkId1).toBe('string');
      expect(typeof bulkId2).toBe('string');
      expect(bulkId1).not.toBe(bulkId2); // Should be different UUIDs

      // Verify the installed_at timestamp is reasonable (between before and after the call)
      const installedAt1 = bulkCall.operations[1].installed_at;
      const installedAt2 = bulkCall.operations[3].installed_at;

      expect(installedAt1).toBe(installedAt2); // Should be the same timestamp for all docs in same operation
      expect(installedAt1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); // ISO format
      expect(new Date(installedAt1).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeCall).getTime()
      );
      expect(new Date(installedAt1).getTime()).toBeLessThanOrEqual(new Date(afterCall).getTime());
    });

    it('should delete existing content even when no new content provided', async () => {
      const result = await saveKnowledgeBaseContentToIndex({
        esClient: mockEsClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: [],
      });

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: `${INTEGRATION_KNOWLEDGE_INDEX}*`,
        query: {
          match: { package_name: 'test-package' },
        },
      });
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should delete existing content even when knowledge base content is undefined', async () => {
      const result = await saveKnowledgeBaseContentToIndex({
        esClient: mockEsClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: undefined as any,
      });

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: `${INTEGRATION_KNOWLEDGE_INDEX}*`,
        query: {
          match: { package_name: 'test-package' },
        },
      });
      expect(mockEsClient.bulk).not.toHaveBeenCalled();
      expect(result).toEqual([]);
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
          match: { package_name: 'test-package' },
        },
        size: 1000,
      });

      expect(result).toEqual([
        {
          fileName: 'test1.md',
          content: 'Test content 1',
          path: 'docs/knowledge_base/test1.md',
          installed_at: undefined,
          version: '1.0.0',
        },
        {
          fileName: 'test2.md',
          content: 'Test content 2',
          path: 'docs/knowledge_base/test2.md',
          installed_at: undefined,
          version: '1.0.0',
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
        index: `${INTEGRATION_KNOWLEDGE_INDEX}*`,
        query: {
          match: { package_name: 'test-package' },
        },
      });
    });

    it('should delete by package name', async () => {
      await deletePackageKnowledgeBase(mockEsClient, 'test-package');

      expect(mockEsClient.deleteByQuery).toHaveBeenCalledWith({
        index: `${INTEGRATION_KNOWLEDGE_INDEX}*`,
        query: {
          match: { package_name: 'test-package' },
        },
      });
    });
  });
});
