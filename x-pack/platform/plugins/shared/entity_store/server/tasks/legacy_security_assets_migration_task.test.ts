/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  findInstalledEntityStoreNamespaces,
  LEGACY_SECURITY_ASSETS_MIGRATION_TASK_ID,
  runLegacySecurityAssetsMigration,
  scheduleLegacySecurityAssetsMigrationIfNeeded,
} from './legacy_security_assets_migration_task';
import { installSharedElasticsearchAssets } from '../domain/asset_manager/install_assets';
import { hasLegacySecurityAssets } from '../domain/asset_manager/migrate_legacy_security_assets';
import { EngineDescriptorTypeName } from '../domain/saved_objects';

jest.mock('../domain/asset_manager/install_assets');
jest.mock('../domain/asset_manager/migrate_legacy_security_assets');

const mockInstallSharedElasticsearchAssets =
  installSharedElasticsearchAssets as jest.MockedFunction<typeof installSharedElasticsearchAssets>;
const mockHasLegacySecurityAssets = hasLegacySecurityAssets as jest.MockedFunction<
  typeof hasLegacySecurityAssets
>;

describe('legacy_security_assets_migration_task', () => {
  const logger = loggerMock.create();
  let mockEsClient: ElasticsearchClient;
  let mockFind: jest.Mock;
  let coreStart: CoreStart;
  let taskManager: jest.Mocked<Pick<TaskManagerStartContract, 'ensureScheduled'>>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEsClient = {} as ElasticsearchClient;
    mockFind = jest.fn();
    mockInstallSharedElasticsearchAssets.mockResolvedValue(undefined);
    mockHasLegacySecurityAssets.mockResolvedValue(false);

    coreStart = {
      elasticsearch: {
        client: {
          asInternalUser: mockEsClient,
        },
      },
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({ find: mockFind }),
      },
    } as unknown as CoreStart;

    taskManager = {
      ensureScheduled: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe('findInstalledEntityStoreNamespaces', () => {
    it('returns unique namespaces from engine descriptors across spaces', async () => {
      mockFind.mockResolvedValue({
        saved_objects: [
          { namespaces: ['default'] },
          { namespaces: ['default'] },
          { namespaces: ['security'] },
          { namespaces: ['*'] },
          { namespaces: undefined },
        ],
      });

      await expect(findInstalledEntityStoreNamespaces(coreStart)).resolves.toEqual([
        'default',
        'security',
      ]);
      expect(coreStart.savedObjects.createInternalRepository).toHaveBeenCalledWith([
        EngineDescriptorTypeName,
      ]);
      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EngineDescriptorTypeName,
          namespaces: ['*'],
        })
      );
    });
  });

  describe('runLegacySecurityAssetsMigration', () => {
    it('migrates only namespaces that still have legacy security assets', async () => {
      mockFind.mockResolvedValue({
        saved_objects: [{ namespaces: ['default'] }, { namespaces: ['other'] }],
      });
      mockHasLegacySecurityAssets.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const signal = new AbortController().signal;
      const result = await runLegacySecurityAssetsMigration({
        coreStart,
        logger,
        signal,
        isMigrationEnabled: async () => true,
      });

      expect(result).toEqual({ migrated: ['default'], skipped: ['other'] });
      expect(mockInstallSharedElasticsearchAssets).toHaveBeenCalledTimes(1);
      expect(mockInstallSharedElasticsearchAssets).toHaveBeenCalledWith({
        esClient: mockEsClient,
        migrationEsClient: mockEsClient,
        logger: expect.anything(),
        namespace: 'default',
        allowLegacyMigration: true,
      });
    });

    it('throws a retryable abort when the task signal is aborted', async () => {
      mockFind.mockResolvedValue({
        saved_objects: [{ namespaces: ['default'] }],
      });
      const controller = new AbortController();
      controller.abort();

      await expect(
        runLegacySecurityAssetsMigration({
          coreStart,
          logger,
          signal: controller.signal,
          isMigrationEnabled: async () => true,
        })
      ).rejects.toThrow(/aborted/i);
      expect(mockInstallSharedElasticsearchAssets).not.toHaveBeenCalled();
    });

    it('does not migrate when the feature flag is off', async () => {
      mockFind.mockResolvedValue({
        saved_objects: [{ namespaces: ['default'] }],
      });
      mockHasLegacySecurityAssets.mockResolvedValue(true);

      const result = await runLegacySecurityAssetsMigration({
        coreStart,
        logger,
        signal: new AbortController().signal,
        isMigrationEnabled: async () => false,
      });

      expect(result).toEqual({ migrated: [], skipped: [] });
      expect(mockHasLegacySecurityAssets).not.toHaveBeenCalled();
      expect(mockInstallSharedElasticsearchAssets).not.toHaveBeenCalled();
    });
  });

  describe('scheduleLegacySecurityAssetsMigrationIfNeeded', () => {
    it('does not schedule when no entity store namespaces exist', async () => {
      mockFind.mockResolvedValue({ saved_objects: [] });

      await scheduleLegacySecurityAssetsMigrationIfNeeded({
        coreStart,
        taskManager: taskManager as unknown as TaskManagerStartContract,
        logger,
        isMigrationEnabled: async () => true,
      });

      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    });

    it('schedules a one-shot task when legacy assets remain', async () => {
      mockFind.mockResolvedValue({
        saved_objects: [{ namespaces: ['default'] }],
      });
      mockHasLegacySecurityAssets.mockResolvedValue(true);

      await scheduleLegacySecurityAssetsMigrationIfNeeded({
        coreStart,
        taskManager: taskManager as unknown as TaskManagerStartContract,
        logger,
        isMigrationEnabled: async () => true,
      });

      expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({
          id: LEGACY_SECURITY_ASSETS_MIGRATION_TASK_ID,
          taskType: LEGACY_SECURITY_ASSETS_MIGRATION_TASK_ID,
          params: {},
          state: {},
        })
      );
    });

    it('does not schedule when every installed namespace is already neutral', async () => {
      mockFind.mockResolvedValue({
        saved_objects: [{ namespaces: ['default'] }],
      });
      mockHasLegacySecurityAssets.mockResolvedValue(false);

      await scheduleLegacySecurityAssetsMigrationIfNeeded({
        coreStart,
        taskManager: taskManager as unknown as TaskManagerStartContract,
        logger,
        isMigrationEnabled: async () => true,
      });

      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
    });

    it('does not schedule when the feature flag is off even if legacy assets remain', async () => {
      mockFind.mockResolvedValue({
        saved_objects: [{ namespaces: ['default'] }],
      });
      mockHasLegacySecurityAssets.mockResolvedValue(true);

      await scheduleLegacySecurityAssetsMigrationIfNeeded({
        coreStart,
        taskManager: taskManager as unknown as TaskManagerStartContract,
        logger,
        isMigrationEnabled: async () => false,
      });

      expect(taskManager.ensureScheduled).not.toHaveBeenCalled();
      expect(mockHasLegacySecurityAssets).not.toHaveBeenCalled();
    });
  });
});
