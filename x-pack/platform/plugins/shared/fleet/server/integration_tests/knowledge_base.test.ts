/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { saveKnowledgeBaseContent } from '../services/epm/packages/install_state_machine/steps/step_save_archive_entries';
import { getPackageKnowledgeBase } from '../services/epm/packages/get';
import { KNOWLEDGE_BASE_SAVED_OBJECT_TYPE } from '../../common/constants/epm';
import type { KnowledgeBaseItem, PackageKnowledgeBase } from '../../common/types/models/epm';

describe('Knowledge Base End-to-End Integration Test', () => {
  let soClient: jest.Mocked<any>;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
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

    const expectedKnowledgeBaseDoc: PackageKnowledgeBase = {
      package_name: 'test-integration',
      version: '1.2.0',
      installed_at: expect.any(String),
      knowledge_base_content: knowledgeBaseContent,
    };

    // Mock the saved object create operation
    soClient.create.mockResolvedValueOnce({
      id: 'test-integration',
      type: KNOWLEDGE_BASE_SAVED_OBJECT_TYPE,
      attributes: expectedKnowledgeBaseDoc,
      references: [],
    });

    // Mock the saved object get operation for retrieval
    soClient.get.mockResolvedValueOnce({
      id: 'test-integration',
      type: KNOWLEDGE_BASE_SAVED_OBJECT_TYPE,
      attributes: expectedKnowledgeBaseDoc,
      references: [],
    });

    // Step 1: Save knowledge base content during package installation
    await saveKnowledgeBaseContent({
      savedObjectsClient: soClient,
      pkgName: 'test-integration',
      pkgVersion: '1.2.0',
      knowledgeBaseContent,
    });

    // Verify that the knowledge base content was saved correctly
    expect(soClient.create).toHaveBeenCalledWith(
      KNOWLEDGE_BASE_SAVED_OBJECT_TYPE,
      expectedKnowledgeBaseDoc,
      {
        id: 'test-integration',
        overwrite: true,
      }
    );

    // Step 2: Retrieve knowledge base content through the API
    const retrievedKnowledgeBase = await getPackageKnowledgeBase({
      savedObjectsClient: soClient,
      pkgName: 'test-integration',
    });

    // Verify that the retrieved content matches what was saved
    expect(soClient.get).toHaveBeenCalledWith(KNOWLEDGE_BASE_SAVED_OBJECT_TYPE, 'test-integration');

    expect(retrievedKnowledgeBase).toEqual(expectedKnowledgeBaseDoc);
    expect(retrievedKnowledgeBase?.knowledge_base_content).toHaveLength(2);
    expect(retrievedKnowledgeBase?.knowledge_base_content[0].filename).toBe('setup-guide.md');
    expect(retrievedKnowledgeBase?.knowledge_base_content[0].content).toContain('Setup Guide');
    expect(retrievedKnowledgeBase?.knowledge_base_content[1].filename).toBe('troubleshooting.md');
    expect(retrievedKnowledgeBase?.knowledge_base_content[1].content).toContain('Common Issues');
  });

  it('should handle packages without knowledge base content', async () => {
    // Test that packages without knowledge base content don't create saved objects
    await saveKnowledgeBaseContent({
      savedObjectsClient: soClient,
      pkgName: 'simple-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: [],
    });

    expect(soClient.create).not.toHaveBeenCalled();

    // Mock not found error for retrieval
    const notFoundError = new Error('Not found');
    (notFoundError as any).output = { statusCode: 404 };
    soClient.get.mockRejectedValueOnce(notFoundError);

    const retrievedKnowledgeBase = await getPackageKnowledgeBase({
      savedObjectsClient: soClient,
      pkgName: 'simple-package',
    });

    expect(retrievedKnowledgeBase).toBeUndefined();
  });

  it('should verify the saved object type is properly registered', () => {
    // Verify that the knowledge base saved object type constant is correct
    expect(KNOWLEDGE_BASE_SAVED_OBJECT_TYPE).toBe('epm-packages-knowledge-base');
  });
});
