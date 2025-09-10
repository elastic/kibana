/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createTestServers,
  createRootWithCorePlugins,
} from '@kbn/core-test-helpers-kbn-server';
import type { ElasticsearchClient } from '@kbn/core/server';

import {
  saveKnowledgeBaseContentToIndex,
  INTEGRATION_KNOWLEDGE_INDEX,
  getPackageKnowledgeBaseFromIndex,
} from '../services/epm/packages/knowledge_base_index';
import { getPackageKnowledgeBase } from '../services/epm/packages/get';

import type { KnowledgeBaseItem } from '../../common/types/models/epm';

describe('Knowledge Base End-to-End Integration Test', () => {
  let esServer: TestElasticsearchUtils;
  let kbnServer: TestKibanaUtils;
  let esClient: ElasticsearchClient;

  const startServers = async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'trial',
        },
        kbn: {},
      },
    });

    esServer = await startES();

    const root = createRootWithCorePlugins(
      {
        logging: {
          loggers: [
            {
              name: 'root',
              level: 'error', // Reduce log noise
            },
          ],
        },
      },
      { oss: false }
    );

    await root.preboot();
    const coreSetup = await root.setup();
    const coreStart = await root.start();

    kbnServer = {
      root,
      coreSetup,
      coreStart,
      stop: async () => await root.shutdown(),
    };

    esClient = coreStart.elasticsearch.client.asInternalUser;
  };

  const stopServers = async () => {
    if (kbnServer) {
      await kbnServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
  };

  beforeAll(async () => {
    await startServers();
  });

  afterAll(async () => {
    await stopServers();
  });

  beforeEach(async () => {
    // Clean up any existing test data before each test
    try {
      await esClient.indices.delete({
        index: INTEGRATION_KNOWLEDGE_INDEX,
        ignore_unavailable: true,
      });
    } catch (error) {
      // Ignore errors if index doesn't exist
    }
  });

  it('should save and retrieve knowledge base content through the complete flow', async () => {
    // Mock knowledge base content from package
    const knowledgeBaseContent: KnowledgeBaseItem[] = [
      {
        fileName: 'setup-guide.md',
        content:
          '# Setup Guide\n\nThis guide helps you set up the integration.\n\n## Prerequisites\n\n- Node.js 16+\n- Elasticsearch cluster',
        version: '1.0.0',
        installed_at: new Date().toISOString(),
        path: '/knowledge_base/setup-guide.md',
      },
      {
        fileName: 'troubleshooting.md',
        content:
          '# Troubleshooting\n\n## Common Issues\n\n### Connection Problems\n\nIf you experience connection issues, check your network settings.',
        version: '1.0.0',
        installed_at: new Date().toISOString(),
        path: '/knowledge_base/troubleshooting.md',
      },
    ];

    // Step 1: Save knowledge base content during package installation
    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'test-integration',
      pkgVersion: '1.2.0',
      knowledgeBaseContent,
    });

    // Wait a moment for the index operation to complete after the model deployment finishes up
    // ES will actually index the failed items here
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Step 2: Retrieve knowledge base content through the API
    const retrievedKnowledgeBase = await getPackageKnowledgeBase({
      esClient,
      pkgName: 'test-integration',
    });

    // Verify that the retrieved content matches what was saved
    expect(retrievedKnowledgeBase).toBeDefined();
    expect(retrievedKnowledgeBase?.package.name).toBe('test-integration');
    expect(retrievedKnowledgeBase?.items[0].version).toBe('1.2.0');
    expect(retrievedKnowledgeBase?.items).toHaveLength(2);

    // Check the first knowledge base item
    const setupGuide = retrievedKnowledgeBase?.items.find(
      (item) => item.fileName === 'setup-guide.md'
    );
    expect(setupGuide).toBeDefined();
    expect(setupGuide?.content).toContain('Setup Guide');
    expect(setupGuide?.content).toContain('Prerequisites');

    // Check the second knowledge base item
    const troubleshooting = retrievedKnowledgeBase?.items.find(
      (item) => item.fileName === 'troubleshooting.md'
    );
    expect(troubleshooting).toBeDefined();
    expect(troubleshooting?.content).toContain('Troubleshooting');
    expect(troubleshooting?.content).toContain('Connection Problems');
  });

  it('should handle packages without knowledge base content', async () => {
    // Test that packages without knowledge base content don't create any documents
    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'simple-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: [],
    });

    // Wait a moment for any potential indexing
    await new Promise((resolve) => setTimeout(resolve, 500));

    const retrievedKnowledgeBase = await getPackageKnowledgeBase({
      esClient,
      pkgName: 'simple-package',
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
        fileName: 'old-guide.md',
        content: '# Old Guide\n\nThis is the old version of the guide.',
        version: '1.0.0',
        installed_at: new Date().toISOString(),
        path: '/knowledge_base/old-guide.md',
      },
    ];

    // Mock knowledge base content for version 2.0.0
    const knowledgeBaseContentV2: KnowledgeBaseItem[] = [
      {
        fileName: 'new-guide.md',
        content: '# New Guide\n\nThis is the updated version of the guide.',
        version: '2.0.0',
        installed_at: new Date().toISOString(),
        path: '/knowledge_base/new-guide.md',
      },
      {
        fileName: 'features.md',
        content: '# New Features\n\nNew features in version 2.0.0.',
        version: '2.0.0',
        installed_at: new Date().toISOString(),
        path: '/knowledge_base/features.md',
      },
    ];

    // Step 1: Install package version 1.0.0
    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: knowledgeBaseContentV1,
    });

    // Wait for indexing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify v1.0.0 content is present
    const v1Result = await getPackageKnowledgeBase({
      esClient,
      pkgName: 'test-package',
    });
    expect(v1Result?.items).toHaveLength(1);
    expect(v1Result?.items[0].fileName).toBe('old-guide.md');

    // Step 2: Upgrade to version 2.0.0 using the save function (which handles upgrades)
    await saveKnowledgeBaseContentToIndex({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '2.0.0',
      knowledgeBaseContent: knowledgeBaseContentV2,
    });

    // Wait for indexing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify that old version content is no longer available by getting it again and checking that every item is the new version
    const result = await getPackageKnowledgeBaseFromIndex(esClient, 'test-package');
    expect(result.every((item) => item.version === '2.0.0')).toBe(true);

    // Verify that new version content is available
    const newVersionResult = await getPackageKnowledgeBase({
      esClient,
      pkgName: 'test-package',
    });
    expect(newVersionResult?.items).toHaveLength(2);
    expect(newVersionResult?.items[0].version).toBe('2.0.0');

    const newGuide = newVersionResult?.items.find((item) => item.fileName === 'new-guide.md');
    expect(newGuide?.content).toContain('New Guide');

    const features = newVersionResult?.items.find((item) => item.fileName === 'features.md');
    expect(features?.content).toContain('New Features');
  });
});
