/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  saveKnowledgeBaseContentToIndex,
  INTEGRATION_KNOWLEDGE_INDEX,
  updatePackageKnowledgeBaseVersion,
} from '../services/epm/packages/knowledge_base_index';
import { getPackageKnowledgeBase } from '../services/epm/packages/get';
import type { KnowledgeBaseItem } from '../../common/types/models/epm';

describe('Knowledge Base End-to-End Integration Test', () => {
  let esClient: jest.Mocked<any>;

  beforeEach(() => {
    esClient = {
      indices: {
        existsIndexTemplate: jest.fn().mockResolvedValue(true),
        exists: jest.fn().mockResolvedValue(true),
        putIndexTemplate: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      deleteByQuery: jest.fn().mockResolvedValue({}),
      bulk: jest.fn().mockResolvedValue({}),
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [
            {
              _source: {
                package_name: 'test-integration',
                filename: 'setup-guide.md',
                content:
                  '# Setup Guide\n\nThis guide helps you set up the integration.\n\n## Prerequisites\n\n- Node.js 16+\n- Elasticsearch cluster',
                version: '1.2.0',
              },
            },
            {
              _source: {
                package_name: 'test-integration',
                filename: 'troubleshooting.md',
                content:
                  '# Troubleshooting\n\n## Common Issues\n\n### Connection Problems\n\nIf you experience connection issues, check your network settings.',
                version: '1.2.0',
              },
            },
          ],
        },
      }),
    };
    jest.clearAllMocks();
  });

  it('should save and retrieve knowledge base content through the complete flow', async () => {
    // Mock knowledge base content from package
    const knowledgeBaseContent: KnowledgeBaseItem[] = [
      {
        filename: 'setup-guide.md',
        content:
          '# Setup Guide\n\nThis guide helps you set up the integration.\n\n## Prerequisites\n\n- Node.js 16+\n- Elasticsearch cluster',
      },
      {
        filename: 'troubleshooting.md',
        content:
          '# Troubleshooting\n\n## Common Issues\n\n### Connection Problems\n\nIf you experience connection issues, check your network settings.',
      },
    ];

    // Step 1: Save knowledge base content during package installation
    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'test-integration',
      pkgVersion: '1.2.0',
      knowledgeBaseContent,
    });

    // Verify that the knowledge base content was indexed correctly
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: INTEGRATION_KNOWLEDGE_INDEX,
      query: {
        bool: {
          must: [
            { term: { 'package_name.keyword': 'test-integration' } },
            { term: { version: '1.2.0' } },
          ],
        },
      },
      refresh: true,
    });

    expect(esClient.bulk).toHaveBeenCalledWith({
      operations: expect.arrayContaining([
        {
          index: {
            _index: INTEGRATION_KNOWLEDGE_INDEX,
            _id: 'test-integration-setup-guide.md',
          },
        },
        {
          package_name: 'test-integration',
          filename: 'setup-guide.md',
          content: expect.stringContaining('Setup Guide'),
          version: '1.2.0',
        },
        {
          index: {
            _index: INTEGRATION_KNOWLEDGE_INDEX,
            _id: 'test-integration-troubleshooting.md',
          },
        },
        {
          package_name: 'test-integration',
          filename: 'troubleshooting.md',
          content: expect.stringContaining('Troubleshooting'),
          version: '1.2.0',
        },
      ]),
      refresh: 'wait_for',
    });

    // Step 2: Retrieve knowledge base content through the API
    const retrievedKnowledgeBase = await getPackageKnowledgeBase({
      esClient,
      pkgName: 'test-integration',
      pkgVersion: '1.2.0',
    });

    // Verify that the search was called correctly
    expect(esClient.search).toHaveBeenCalledWith({
      index: INTEGRATION_KNOWLEDGE_INDEX,
      query: {
        bool: {
          must: [
            { term: { 'package_name.keyword': 'test-integration' } },
            { term: { version: '1.2.0' } },
          ],
        },
      },
      sort: [{ filename: 'asc' }],
      size: 1000,
    });

    // Verify that the retrieved content matches what was saved
    expect(retrievedKnowledgeBase).toEqual({
      package_name: 'test-integration',
      version: '1.2.0',
      installed_at: expect.any(String),
      knowledge_base_content: [
        {
          filename: 'setup-guide.md',
          content: expect.stringContaining('Setup Guide'),
          path: 'docs/knowledge_base/setup-guide.md',
          installed_at: expect.any(String),
        },
        {
          filename: 'troubleshooting.md',
          content: expect.stringContaining('Troubleshooting'),
          path: 'docs/knowledge_base/troubleshooting.md',
          installed_at: expect.any(String),
        },
      ],
    });
  });

  it('should handle packages without knowledge base content', async () => {
    // Test that packages without knowledge base content don't call bulk index
    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'simple-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: [],
    });

    expect(esClient.bulk).not.toHaveBeenCalled();

    // Mock empty search results for retrieval
    esClient.search.mockResolvedValueOnce({
      hits: {
        hits: [],
      },
    });

    const retrievedKnowledgeBase = await getPackageKnowledgeBase({
      esClient,
      pkgName: 'simple-package',
      pkgVersion: '1.0.0',
    });

    expect(retrievedKnowledgeBase).toBeUndefined();
  });

  it('should verify the system index name is correct', () => {
    // Verify that the knowledge base system index name is correct
    expect(INTEGRATION_KNOWLEDGE_INDEX).toBe('.integration_knowledge');
  });

  it('should handle package version upgrades correctly', async () => {
    // Mock knowledge base content for version 1.0.0
    const knowledgeBaseContentV1: KnowledgeBaseItem[] = [
      {
        filename: 'old-guide.md',
        content: '# Old Guide\n\nThis is the old version of the guide.',
      },
    ];

    // Mock knowledge base content for version 2.0.0
    const knowledgeBaseContentV2: KnowledgeBaseItem[] = [
      {
        filename: 'new-guide.md',
        content: '# New Guide\n\nThis is the updated version of the guide.',
      },
      {
        filename: 'features.md',
        content: '# New Features\n\nNew features in version 2.0.0.',
      },
    ];

    // Step 1: Install package version 1.0.0
    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: knowledgeBaseContentV1,
    });

    // Step 2: Upgrade to version 2.0.0 using the upgrade function
    await updatePackageKnowledgeBaseVersion({
      esClient,
      pkgName: 'test-package',
      oldVersion: '1.0.0',
      newVersion: '2.0.0',
      knowledgeBaseContent: knowledgeBaseContentV2,
    });

    // Verify that old version content was deleted (called twice - once for v1.0.0, once for upgrade)
    expect(esClient.deleteByQuery).toHaveBeenCalledWith({
      index: INTEGRATION_KNOWLEDGE_INDEX,
      query: {
        term: { 'package_name.keyword': 'test-package' },
      },
      refresh: true,
    });

    // Verify that new version content was indexed
    expect(esClient.bulk).toHaveBeenCalledWith({
      operations: expect.arrayContaining([
        {
          index: {
            _index: INTEGRATION_KNOWLEDGE_INDEX,
            _id: 'test-package-new-guide.md',
          },
        },
        {
          package_name: 'test-package',
          filename: 'new-guide.md',
          content: expect.stringContaining('New Guide'),
          version: '2.0.0',
        },
        {
          index: {
            _index: INTEGRATION_KNOWLEDGE_INDEX,
            _id: 'test-package-features.md',
          },
        },
        {
          package_name: 'test-package',
          filename: 'features.md',
          content: expect.stringContaining('New Features'),
          version: '2.0.0',
        },
      ]),
      refresh: 'wait_for',
    });
  });
});
