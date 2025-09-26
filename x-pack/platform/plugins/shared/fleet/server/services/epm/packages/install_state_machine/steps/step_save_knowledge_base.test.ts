/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { ArchiveIterator, ArchiveEntry } from '../../../../../../common/types/models/epm';

import { saveKnowledgeBaseContentToIndex } from '../../knowledge_base_index';
import type { InstallContext } from '../_state_machine_package_install';

import { stepSaveKnowledgeBase, cleanupKnowledgeBaseStep } from './step_save_knowledge_base';

// Mock the app context service
jest.mock('../../../../app_context', () => ({
  appContextService: {
    getLogger: jest.fn().mockReturnValue({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    }),
  },
}));

// Mock the knowledge base index module
jest.mock('../../knowledge_base_index');

// Mock the es assets reference module
jest.mock('../../es_assets_reference', () => ({
  updateEsAssetReferences: jest.fn().mockResolvedValue([]),
}));

// Mock the utils module
jest.mock('../../utils', () => ({
  withPackageSpan: jest.fn().mockImplementation((description, fn) => fn()),
}));

// Mock the license service
jest.mock('../../../../license', () => ({
  licenseService: {
    isEnterprise: jest.fn().mockReturnValue(true),
  },
}));

let esClient: jest.Mocked<ElasticsearchClient>;
let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

describe('stepSaveKnowledgeBase', () => {
  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    savedObjectsClient = savedObjectsClientMock.create();
    jest.clearAllMocks();

    // Mock saveKnowledgeBaseContentToIndex to return expected document IDs
    const mockSaveKnowledgeBase = saveKnowledgeBaseContentToIndex as jest.MockedFunction<
      typeof saveKnowledgeBaseContentToIndex
    >;
    mockSaveKnowledgeBase.mockResolvedValue([
      'test-package-guide.md',
      'test-package-troubleshooting.md',
    ]);
  });

  const createMockArchiveIterator = (entries: ArchiveEntry[]): ArchiveIterator => ({
    traverseEntries: jest.fn().mockImplementation(async (onEntry, filterFn) => {
      for (const entry of entries) {
        if (!filterFn || filterFn(entry.path)) {
          await onEntry(entry);
        }
      }
    }),
    getPaths: jest.fn().mockResolvedValue(entries.map((e) => e.path)),
  });

  const createMockContext = (
    archiveIterator: ArchiveIterator,
    packageName = 'test-package'
  ): InstallContext =>
    ({
      packageInstallContext: {
        packageInfo: {
          name: packageName,
          version: '1.0.0',
          title: 'Test Package',
          owner: 'test',
        } as any,
        paths: [],
        archiveIterator,
      },
      esClient,
      savedObjectsClient,
      installedPkg: undefined,
      esReferences: [],
      installType: 'install',
      installSource: 'registry',
      spaceId: 'default',
      logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      } as any,
    } as InstallContext);

  it('should extract and save knowledge base files from archive', async () => {
    const entries: ArchiveEntry[] = [
      {
        path: 'test-package-1.0.0/docs/knowledge_base/guide.md',
        buffer: Buffer.from('# User Guide\n\nThis is a comprehensive guide.', 'utf8'),
      },
      {
        path: 'test-package-1.0.0/docs/knowledge_base/troubleshooting.md',
        buffer: Buffer.from('# Troubleshooting\n\nCommon issues and solutions.', 'utf8'),
      },
      {
        path: 'test-package-1.0.0/manifest.yml', // Should be ignored
        buffer: Buffer.from('name: test-package', 'utf8'),
      },
    ];

    const mockArchiveIterator = createMockArchiveIterator(entries);
    const context = createMockContext(mockArchiveIterator);

    await stepSaveKnowledgeBase(context);

    // Verify that the archive iterator was called with the correct filter
    expect(mockArchiveIterator.traverseEntries).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function)
    );

    // Verify that saveKnowledgeBaseContentToIndex was called with extracted knowledge base items
    expect(saveKnowledgeBaseContentToIndex).toHaveBeenCalledWith({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: [
        {
          fileName: 'guide.md',
          content: '# User Guide\n\nThis is a comprehensive guide.',
        },
        {
          fileName: 'troubleshooting.md',
          content: '# Troubleshooting\n\nCommon issues and solutions.',
        },
      ],
    });
  });

  it('should not save anything when no knowledge base files exist in archive', async () => {
    const entries: ArchiveEntry[] = [
      {
        path: 'test-package-1.0.0/manifest.yml',
        buffer: Buffer.from('name: test-package', 'utf8'),
      },
      {
        path: 'test-package-1.0.0/docs/README.md',
        buffer: Buffer.from('# README', 'utf8'),
      },
    ];

    const mockArchiveIterator = createMockArchiveIterator(entries);
    const context = createMockContext(mockArchiveIterator);

    await stepSaveKnowledgeBase(context);

    // Verify that saveKnowledgeBaseContentToIndex was not called
    expect(saveKnowledgeBaseContentToIndex).not.toHaveBeenCalled();
  });

  it('should skip files without buffers', async () => {
    const entries: ArchiveEntry[] = [
      {
        path: 'test-package-1.0.0/docs/knowledge_base/guide.md',
        buffer: Buffer.from('# User Guide\n\nThis is a comprehensive guide.', 'utf8'),
      },
      {
        path: 'test-package-1.0.0/docs/knowledge_base/missing.md',
        // No buffer
      },
    ];

    const mockArchiveIterator = createMockArchiveIterator(entries);
    const context = createMockContext(mockArchiveIterator);

    await stepSaveKnowledgeBase(context);

    expect(saveKnowledgeBaseContentToIndex).toHaveBeenCalledWith({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: [
        {
          fileName: 'guide.md',
          content: '# User Guide\n\nThis is a comprehensive guide.',
        },
      ],
    });
  });

  it('should handle Unicode content correctly', async () => {
    const unicodeContent = '# Guide 🚀\n\n测试 Unicode 内容 Ñoño café';
    const entries: ArchiveEntry[] = [
      {
        path: 'test-package-1.0.0/docs/knowledge_base/unicode.md',
        buffer: Buffer.from(unicodeContent, 'utf8'),
      },
    ];

    const mockArchiveIterator = createMockArchiveIterator(entries);
    const context = createMockContext(mockArchiveIterator);

    await stepSaveKnowledgeBase(context);

    expect(saveKnowledgeBaseContentToIndex).toHaveBeenCalledWith({
      esClient,
      pkgName: 'test-package',
      pkgVersion: '1.0.0',
      knowledgeBaseContent: [
        {
          fileName: 'unicode.md',
          content: unicodeContent,
        },
      ],
    });
  });

  describe('Package Upgrade Scenarios', () => {
    it('should call saveKnowledgeBaseContentToIndex for package upgrades', async () => {
      const entries: ArchiveEntry[] = [
        {
          path: 'test-package-2.0.0/docs/knowledge_base/guide.md',
          buffer: Buffer.from('# Updated Guide', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      // Mock an existing installed package with different version
      context.installedPkg = {
        attributes: {
          name: 'test-package',
          version: '1.0.0',
        },
      } as any;

      context.packageInstallContext.packageInfo.version = '2.0.0';

      await stepSaveKnowledgeBase(context);

      expect(saveKnowledgeBaseContentToIndex).toHaveBeenCalledWith({
        esClient,
        pkgName: 'test-package',
        pkgVersion: '2.0.0',
        knowledgeBaseContent: [
          {
            fileName: 'guide.md',
            content: '# Updated Guide',
          },
        ],
      });
    });

    it('should use saveKnowledgeBaseContentToIndex for fresh installs', async () => {
      const entries: ArchiveEntry[] = [
        {
          path: 'test-package-1.0.0/docs/knowledge_base/guide.md',
          buffer: Buffer.from('# Guide', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      // No existing installed package (fresh install)
      context.installedPkg = undefined;

      await stepSaveKnowledgeBase(context);

      expect(saveKnowledgeBaseContentToIndex).toHaveBeenCalledWith({
        esClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: [
          {
            fileName: 'guide.md',
            content: '# Guide',
          },
        ],
      });
    });

    it('should use saveKnowledgeBaseContentToIndex for reinstalls of same version', async () => {
      const entries: ArchiveEntry[] = [
        {
          path: 'test-package-1.0.0/docs/knowledge_base/guide.md',
          buffer: Buffer.from('# Guide', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      // Mock existing installed package with same version
      context.installedPkg = {
        attributes: {
          name: 'test-package',
          version: '1.0.0', // Same version as new package
        },
      } as any;

      await stepSaveKnowledgeBase(context);

      expect(saveKnowledgeBaseContentToIndex).toHaveBeenCalledWith({
        esClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: [
          {
            fileName: 'guide.md',
            content: '# Guide',
          },
        ],
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw FleetError when saveKnowledgeBaseContentToIndex fails', async () => {
      const mockError = new Error('Elasticsearch connection failed');
      const mockSaveKnowledgeBase = saveKnowledgeBaseContentToIndex as jest.MockedFunction<
        typeof saveKnowledgeBaseContentToIndex
      >;
      mockSaveKnowledgeBase.mockRejectedValueOnce(mockError);

      const entries: ArchiveEntry[] = [
        {
          path: 'test-package-1.0.0/docs/knowledge_base/guide.md',
          buffer: Buffer.from('# Guide', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      await expect(stepSaveKnowledgeBase(context)).rejects.toThrow(
        'Error saving knowledge base content: Error: Elasticsearch connection failed'
      );
    });

    it('should throw FleetError when saveKnowledgeBaseContentToIndex fails during upgrade', async () => {
      const mockError = new Error('Save operation failed');
      (saveKnowledgeBaseContentToIndex as jest.Mock).mockRejectedValueOnce(mockError);

      const entries: ArchiveEntry[] = [
        {
          path: 'test-package-2.0.0/docs/knowledge_base/guide.md',
          buffer: Buffer.from('# Updated Guide', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      context.installedPkg = {
        attributes: {
          name: 'test-package',
          version: '1.0.0',
        },
      } as any;
      context.packageInstallContext.packageInfo.version = '2.0.0';

      await expect(stepSaveKnowledgeBase(context)).rejects.toThrow(
        'Error saving knowledge base content: Error: Save operation failed'
      );
    });

    it('should handle archive traversal errors gracefully', async () => {
      const mockArchiveIterator = {
        traverseEntries: jest.fn().mockRejectedValue(new Error('Archive corruption')),
        getPaths: jest.fn().mockResolvedValue([]),
      };

      const context = createMockContext(mockArchiveIterator as any);

      await expect(stepSaveKnowledgeBase(context)).rejects.toThrow('Archive corruption');
    });
  });

  describe('ES Asset References', () => {
    it('should update ES asset references with knowledge base assets', async () => {
      const { updateEsAssetReferences } = jest.requireMock('../../es_assets_reference');
      updateEsAssetReferences.mockResolvedValueOnce([
        { id: 'test-package-guide.md', type: 'knowledge_base' },
        { id: 'test-package-troubleshooting.md', type: 'knowledge_base' },
      ]);

      const entries: ArchiveEntry[] = [
        {
          path: 'test-package-1.0.0/docs/knowledge_base/guide.md',
          buffer: Buffer.from('# Guide', 'utf8'),
        },
        {
          path: 'test-package-1.0.0/docs/knowledge_base/troubleshooting.md',
          buffer: Buffer.from('# Troubleshooting', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      await stepSaveKnowledgeBase(context);

      expect(updateEsAssetReferences).toHaveBeenCalledWith(savedObjectsClient, 'test-package', [], {
        assetsToAdd: [
          { id: 'test-package-guide.md', type: 'knowledge_base' },
          { id: 'test-package-troubleshooting.md', type: 'knowledge_base' },
        ],
      });

      // Check that context was updated with new references
      expect(context.esReferences).toEqual([
        { id: 'test-package-guide.md', type: 'knowledge_base' },
        { id: 'test-package-troubleshooting.md', type: 'knowledge_base' },
      ]);
    });

    it('should not update ES asset references when no knowledge base files exist', async () => {
      const { updateEsAssetReferences } = jest.requireMock('../../es_assets_reference');

      const entries: ArchiveEntry[] = [
        {
          path: 'test-package-1.0.0/manifest.yml',
          buffer: Buffer.from('name: test-package', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      await stepSaveKnowledgeBase(context);

      expect(updateEsAssetReferences).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty knowledge base content array', async () => {
      // Mock extractKnowledgeBaseFromArchive to return empty array
      const mockArchiveIterator = {
        traverseEntries: jest.fn().mockImplementation(async (onEntry, filterFn) => {
          // Simulate no matching files
        }),
        getPaths: jest.fn().mockResolvedValue([]),
      };

      const context = createMockContext(mockArchiveIterator as any);

      await stepSaveKnowledgeBase(context);

      expect(saveKnowledgeBaseContentToIndex).not.toHaveBeenCalled();
    });

    it('should handle files with different path structures', async () => {
      const entries: ArchiveEntry[] = [
        {
          path: 'nested/test-package-1.0.0/docs/knowledge_base/guide.md',
          buffer: Buffer.from('# Nested Guide', 'utf8'),
        },
        {
          path: 'test-package-1.0.0/docs/knowledge_base/subfolder/advanced.md',
          buffer: Buffer.from('# Advanced Topics', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      await stepSaveKnowledgeBase(context);

      expect(saveKnowledgeBaseContentToIndex).toHaveBeenCalledWith({
        esClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: [
          {
            fileName: 'guide.md',
            content: '# Nested Guide',
          },
          {
            fileName: 'subfolder/advanced.md',
            content: '# Advanced Topics',
          },
        ],
      });
    });

    it('should only process .md files in knowledge_base directory', async () => {
      const entries: ArchiveEntry[] = [
        {
          path: 'test-package-1.0.0/docs/knowledge_base/guide.md',
          buffer: Buffer.from('# Guide', 'utf8'),
        },
        {
          path: 'test-package-1.0.0/docs/knowledge_base/image.png',
          buffer: Buffer.from('binary data', 'utf8'),
        },
        {
          path: 'test-package-1.0.0/docs/knowledge_base/config.json',
          buffer: Buffer.from('{"config": true}', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      await stepSaveKnowledgeBase(context);

      // Should only process the .md file
      expect(saveKnowledgeBaseContentToIndex).toHaveBeenCalledWith({
        esClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: [
          {
            fileName: 'guide.md',
            content: '# Guide',
          },
        ],
      });
    });
  });

  describe('License Validation', () => {
    it('should skip knowledge base processing when Enterprise license is not available', async () => {
      // Mock license service to return false for Enterprise license
      const { licenseService } = jest.requireMock('../../../../license');
      licenseService.isEnterprise.mockReturnValue(false);

      const entries: ArchiveEntry[] = [
        {
          path: 'test-package-1.0.0/docs/knowledge_base/guide.md',
          buffer: Buffer.from('# User Guide\n\nThis is a comprehensive guide.', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      await stepSaveKnowledgeBase(context);

      // Verify that saveKnowledgeBaseContentToIndex was NOT called due to license restriction
      expect(saveKnowledgeBaseContentToIndex).not.toHaveBeenCalled();

      // Verify that updateEsAssetReferences was NOT called
      const { updateEsAssetReferences } = jest.requireMock('../../es_assets_reference');
      expect(updateEsAssetReferences).not.toHaveBeenCalled();

      // Reset the mock back to true for other tests
      licenseService.isEnterprise.mockReturnValue(true);
    });

    it('should process knowledge base when Enterprise license is available', async () => {
      // Ensure license service returns true for Enterprise license
      const { licenseService } = jest.requireMock('../../../../license');
      licenseService.isEnterprise.mockReturnValue(true);

      const entries: ArchiveEntry[] = [
        {
          path: 'test-package-1.0.0/docs/knowledge_base/guide.md',
          buffer: Buffer.from('# User Guide\n\nThis is a comprehensive guide.', 'utf8'),
        },
      ];

      const mockArchiveIterator = createMockArchiveIterator(entries);
      const context = createMockContext(mockArchiveIterator);

      await stepSaveKnowledgeBase(context);

      // Verify that saveKnowledgeBaseContentToIndex WAS called with Enterprise license
      expect(saveKnowledgeBaseContentToIndex).toHaveBeenCalledWith({
        esClient,
        pkgName: 'test-package',
        pkgVersion: '1.0.0',
        knowledgeBaseContent: [
          {
            fileName: 'guide.md',
            content: '# User Guide\n\nThis is a comprehensive guide.',
          },
        ],
      });

      // Verify that updateEsAssetReferences WAS called
      const { updateEsAssetReferences } = jest.requireMock('../../es_assets_reference');
      expect(updateEsAssetReferences).toHaveBeenCalled();
    });
  });
});

describe('cleanupKnowledgeBaseStep', () => {
  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    savedObjectsClient = savedObjectsClientMock.create();
    jest.clearAllMocks();
  });

  const createCleanupContext = (
    retryFromLastState = false,
    force = false,
    initialState = 'save_knowledge_base'
  ): InstallContext =>
    ({
      esClient,
      savedObjectsClient,
      packageInstallContext: {} as any,
      installType: 'install',
      installSource: 'registry',
      spaceId: 'default',
      esReferences: [],
      installedPkg: {
        attributes: {
          name: 'test-package',
          version: '1.0.0',
        },
      } as any,
      retryFromLastState,
      force,
      initialState,
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
      } as any,
    } as InstallContext);

  it('should delete knowledge base content during retry from SAVE_KNOWLEDGE_BASE state', async () => {
    const { deletePackageKnowledgeBase } = jest.requireMock('../../knowledge_base_index');
    const context = createCleanupContext(true, false, 'save_knowledge_base');

    await cleanupKnowledgeBaseStep(context);

    expect(deletePackageKnowledgeBase).toHaveBeenCalledWith(esClient, 'test-package');
    expect(context.logger.debug).toHaveBeenCalledWith(
      'Retry transition - clean up package knowledge base content'
    );
  });

  it('should not clean up when force is true', async () => {
    const { deletePackageKnowledgeBase } = jest.requireMock('../../knowledge_base_index');
    const context = createCleanupContext(true, true, 'save_knowledge_base');

    await cleanupKnowledgeBaseStep(context);

    expect(deletePackageKnowledgeBase).not.toHaveBeenCalled();
  });

  it('should not clean up when not retrying from last state', async () => {
    const { deletePackageKnowledgeBase } = jest.requireMock('../../knowledge_base_index');
    const context = createCleanupContext(false, false, 'save_knowledge_base');

    await cleanupKnowledgeBaseStep(context);

    expect(deletePackageKnowledgeBase).not.toHaveBeenCalled();
  });

  it('should not clean up when initial state is not SAVE_KNOWLEDGE_BASE', async () => {
    const { deletePackageKnowledgeBase } = jest.requireMock('../../knowledge_base_index');
    const context = createCleanupContext(true, false, 'install_kibana_assets');

    await cleanupKnowledgeBaseStep(context);

    expect(deletePackageKnowledgeBase).not.toHaveBeenCalled();
  });

  it('should not clean up when esClient is missing', async () => {
    const { deletePackageKnowledgeBase } = jest.requireMock('../../knowledge_base_index');
    const context = createCleanupContext(true, false, 'save_knowledge_base');
    context.esClient = undefined as any;

    await cleanupKnowledgeBaseStep(context);

    expect(deletePackageKnowledgeBase).not.toHaveBeenCalled();
  });

  it('should not clean up when installedPkg is missing', async () => {
    const { deletePackageKnowledgeBase } = jest.requireMock('../../knowledge_base_index');
    const context = createCleanupContext(true, false, 'save_knowledge_base');
    context.installedPkg = undefined;

    await cleanupKnowledgeBaseStep(context);

    expect(deletePackageKnowledgeBase).not.toHaveBeenCalled();
  });
});
