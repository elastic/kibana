/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../artifact_manager', () => {
  return {
    ArtifactManager: jest.fn(),
  };
});

jest.mock('../index_manager', () => {
  return {
    IndexManager: jest.fn(),
  };
});

jest.mock('../saved_objects_manager', () => {
  return {
    SavedObjectsManager: jest.fn(),
  };
});

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { DatasetSampleType } from '../../../common';
import type { ISavedObjectsImporter } from '@kbn/core/server';
import { SampleDataManager } from './sample_data_manager';
import { ArtifactManager } from '../artifact_manager';
import { IndexManager } from '../index_manager';
import { SavedObjectsManager } from '../saved_objects_manager';
import type { ZipArchive } from '../types';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { getInstallTaskId, type InstallSampleDataTaskState } from '../../tasks/install_sample_data';

const MockedArtifactManager = ArtifactManager as jest.MockedClass<typeof ArtifactManager>;
const MockedIndexManager = IndexManager as jest.MockedClass<typeof IndexManager>;
const MockedSavedObjectsManager = SavedObjectsManager as jest.MockedClass<
  typeof SavedObjectsManager
>;

describe('SampleDataManager', () => {
  let logger: MockedLogger;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let soClient: ReturnType<typeof savedObjectsClientMock.create>;
  let soImporter: jest.Mocked<ISavedObjectsImporter>;
  let sampleDataManager: SampleDataManager;
  let mockArtifactManager: jest.Mocked<ArtifactManager>;
  let mockIndexManager: jest.Mocked<IndexManager>;
  let mockSavedObjectsManager: jest.Mocked<SavedObjectsManager>;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;

  const mockArchive = {
    close: jest.fn(),
    entries: new Map(),
  } as unknown as ZipArchive;

  const mockManifest = {
    formatVersion: '2.0.0',
    productName: 'kibana',
    productVersion: '8.16',
  };

  const mockMappings = {
    properties: {
      title: { type: 'text' },
      content: { type: 'text' },
    },
  };

  const sampleDataManagerOpts = {
    artifactsFolder: '/tmp/artifacts',
    artifactRepositoryUrl: 'https://artifacts.elastic.co',
    kibanaVersion: '8.16.3',
    indexPrefixName: 'kibana_sample_data_',
  };

  beforeEach(() => {
    logger = loggerMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    soClient = savedObjectsClientMock.create();
    soImporter = {
      import: jest.fn(),
    } as any;

    mockArtifactManager = {
      prepareArtifact: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    mockIndexManager = {
      createAndPopulateIndex: jest.fn(),
      deleteIndex: jest.fn(),
      hasIndex: jest.fn(),
      setESClient: jest.fn(),
    } as any;

    mockSavedObjectsManager = {
      importSavedObjects: jest.fn(),
      deleteSavedObjects: jest.fn(),
      getDashboardId: jest.fn(),
    } as any;

    MockedArtifactManager.mockImplementation(() => mockArtifactManager);
    MockedIndexManager.mockImplementation(() => mockIndexManager);
    MockedSavedObjectsManager.mockImplementation(() => mockSavedObjectsManager);

    taskManager = taskManagerMock.createStart();

    sampleDataManager = new SampleDataManager({
      ...sampleDataManagerOpts,
      logger,
      isServerlessPlatform: false,
    });

    mockArtifactManager.prepareArtifact.mockResolvedValue({
      archive: mockArchive,
      manifest: mockManifest,
      mappings: mockMappings,
    });
    mockArtifactManager.cleanup.mockResolvedValue(undefined);

    mockIndexManager.createAndPopulateIndex.mockResolvedValue(undefined);
    mockIndexManager.deleteIndex.mockResolvedValue(undefined);
    mockIndexManager.hasIndex.mockResolvedValue(false);

    mockSavedObjectsManager.importSavedObjects.mockResolvedValue({
      savedObjects: [],
      dashboardId: 'test-dashboard-id',
    });
    mockSavedObjectsManager.deleteSavedObjects.mockResolvedValue(3);
    mockSavedObjectsManager.getDashboardId.mockResolvedValue('test-dashboard-id');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(MockedArtifactManager).toHaveBeenCalledWith({
        artifactsFolder: sampleDataManagerOpts.artifactsFolder,
        artifactRepositoryUrl: sampleDataManagerOpts.artifactRepositoryUrl,
        kibanaVersion: sampleDataManagerOpts.kibanaVersion,
        logger: expect.any(Object),
      });

      expect(MockedIndexManager).toHaveBeenCalledWith({
        elserInferenceId: defaultInferenceEndpoints.ELSER,
        logger: expect.any(Object),
        isServerlessPlatform: false,
      });

      expect(MockedSavedObjectsManager).toHaveBeenCalledWith({
        logger: expect.any(Object),
      });
    });

    it('should use custom elserInferenceId when provided', () => {
      const customElserInferenceId = 'custom-inference-id';

      new SampleDataManager({
        ...sampleDataManagerOpts,
        logger,
        elserInferenceId: customElserInferenceId,
        isServerlessPlatform: true,
      });

      expect(MockedIndexManager).toHaveBeenCalledWith({
        elserInferenceId: customElserInferenceId,
        logger: expect.any(Object),
        isServerlessPlatform: true,
      });
    });
  });

  describe('installSampleData', () => {
    const sampleType = 'elasticsearch_documentation' as DatasetSampleType;
    const expectedIndexName = 'kibana_sample_data_elasticsearch_documentation';

    it('should install sample data successfully', async () => {
      const result = await sampleDataManager.installSampleData({
        sampleType,
        esClient,
        soClient,
        soImporter,
      });

      expect(mockSavedObjectsManager.getDashboardId).not.toHaveBeenCalled();
      expect(mockArtifactManager.prepareArtifact).toHaveBeenCalledWith(sampleType, undefined);
      expect(mockIndexManager.createAndPopulateIndex).toHaveBeenCalledWith({
        indexName: expectedIndexName,
        mappings: mockMappings,
        manifest: mockManifest,
        archive: mockArchive,
        esClient,
      });
      expect(mockSavedObjectsManager.importSavedObjects).toHaveBeenCalledWith(
        soImporter,
        sampleType
      );
      expect(mockArtifactManager.cleanup).toHaveBeenCalled();

      expect(result).toEqual({
        indexName: expectedIndexName,
        dashboardId: 'test-dashboard-id',
      });
      expect(logger.info).toHaveBeenCalledWith(`Installing sample data for [${sampleType}]`);
      expect(logger.info).toHaveBeenCalledWith(
        `Sample data installation successful for [${sampleType}]`
      );
    });

    it('should call cleanup when artifact preparation fails', async () => {
      const error = new Error('Artifact preparation failed');
      mockArtifactManager.prepareArtifact.mockRejectedValue(error);

      await expect(
        sampleDataManager.installSampleData({ sampleType, esClient, soClient, soImporter })
      ).rejects.toThrow('Artifact preparation failed');

      expect(mockArtifactManager.cleanup).toHaveBeenCalled();
      expect(mockSavedObjectsManager.deleteSavedObjects).toHaveBeenCalledWith(soClient, sampleType);
      expect(logger.error).toHaveBeenCalledWith(
        `Sample data installation failed for [${sampleType}]: Artifact preparation failed`
      );
      expect(mockIndexManager.createAndPopulateIndex).not.toHaveBeenCalled();
    });

    it('should call cleanup when index creation fails', async () => {
      const error = new Error('Index creation failed');
      mockIndexManager.createAndPopulateIndex.mockRejectedValue(error);

      await expect(
        sampleDataManager.installSampleData({ sampleType, esClient, soClient, soImporter })
      ).rejects.toThrow('Index creation failed');

      expect(mockArtifactManager.cleanup).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Sample data installation failed for [${sampleType}]: Index creation failed`
      );
    });

    it('should delete index when installation fails', async () => {
      const error = new Error('Installation failed');
      mockIndexManager.createAndPopulateIndex.mockRejectedValue(error);

      await expect(
        sampleDataManager.installSampleData({ sampleType, esClient, soClient, soImporter })
      ).rejects.toThrow('Installation failed');

      expect(mockIndexManager.deleteIndex).toHaveBeenCalledWith({
        indexName: expectedIndexName,
        esClient,
      });
      expect(mockIndexManager.deleteIndex).toHaveBeenCalled();
    });

    it('should handle different sample types correctly', async () => {
      const elasticsearchSampleType = 'elasticsearch_documentation' as DatasetSampleType;
      const expectedElasticsearchIndexName = 'kibana_sample_data_elasticsearch_documentation';

      await sampleDataManager.installSampleData({
        sampleType: elasticsearchSampleType,
        esClient,
        soClient,
        soImporter,
      });

      expect(mockArtifactManager.prepareArtifact).toHaveBeenCalledWith(
        elasticsearchSampleType,
        undefined
      );
      expect(mockIndexManager.createAndPopulateIndex).toHaveBeenCalledWith({
        indexName: expectedElasticsearchIndexName,
        mappings: mockMappings,
        manifest: mockManifest,
        archive: mockArchive,
        esClient,
      });
      expect(mockSavedObjectsManager.importSavedObjects).toHaveBeenCalledWith(
        soImporter,
        elasticsearchSampleType
      );
    });

    it('should not install anything if already installed', async () => {
      mockSavedObjectsManager.getDashboardId.mockResolvedValue('existing-dashboard-id');
      mockIndexManager.hasIndex.mockResolvedValue(true);

      const result = await sampleDataManager.installSampleData({
        sampleType,
        esClient,
        soClient,
        soImporter,
      });

      expect(mockSavedObjectsManager.getDashboardId).toHaveBeenCalledWith(soClient, sampleType);
      expect(result).toEqual({
        indexName: expectedIndexName,
        dashboardId: 'existing-dashboard-id',
      });
      expect(mockArtifactManager.prepareArtifact).not.toHaveBeenCalled();
      expect(mockIndexManager.createAndPopulateIndex).not.toHaveBeenCalled();
      expect(mockIndexManager.deleteIndex).not.toHaveBeenCalled();
      expect(mockArtifactManager.cleanup).toHaveBeenCalled();
    });
  });

  describe('removeSampleData', () => {
    it('should remove sample data successfully', async () => {
      const sampleType = 'elasticsearch_documentation' as DatasetSampleType;
      const expectedIndexName = 'kibana_sample_data_elasticsearch_documentation';

      await sampleDataManager.removeSampleData({ sampleType, esClient });

      expect(mockIndexManager.deleteIndex).toHaveBeenCalledWith({
        indexName: expectedIndexName,
        esClient,
      });
    });

    it('should remove sample data and saved objects when soClient provided', async () => {
      const sampleType = 'elasticsearch_documentation' as DatasetSampleType;
      const expectedIndexName = 'kibana_sample_data_elasticsearch_documentation';

      await sampleDataManager.removeSampleData({ sampleType, esClient, soClient });

      expect(mockIndexManager.deleteIndex).toHaveBeenCalledWith({
        indexName: expectedIndexName,
        esClient,
      });
      expect(mockSavedObjectsManager.deleteSavedObjects).toHaveBeenCalledWith(soClient, sampleType);
    });
  });

  describe('getSampleDataStatus', () => {
    const sampleType = 'elasticsearch_documentation' as DatasetSampleType;
    const expectedIndexName = 'kibana_sample_data_elasticsearch_documentation';
    it('should return installing status when background task is running', async () => {
      const taskId = getInstallTaskId(sampleType);
      const task = taskManagerMock.createTask({
        id: taskId,
        status: TaskStatus.Running,
        state: {} as InstallSampleDataTaskState,
      });

      taskManager.get.mockResolvedValue(task);

      const managerWithTaskManager = new SampleDataManager({
        ...sampleDataManagerOpts,
        logger,
        isServerlessPlatform: false,
        taskManager,
      });

      const result = await managerWithTaskManager.getSampleDataStatus({
        sampleType,
        esClient,
        soClient,
      });

      expect(result).toEqual({
        status: 'installing',
        taskId,
      });
      expect(taskManager.get).toHaveBeenCalledWith(taskId);
    });

    it('should return error status when background task failed', async () => {
      const taskId = getInstallTaskId(sampleType);
      const task = taskManagerMock.createTask({
        id: taskId,
        status: TaskStatus.Failed,
        state: { status: 'error', errorMessage: 'boom' } as InstallSampleDataTaskState,
      });

      taskManager.get.mockResolvedValue(task);

      const managerWithTaskManager = new SampleDataManager({
        ...sampleDataManagerOpts,
        logger,
        isServerlessPlatform: false,
        taskManager,
      });

      const result = await managerWithTaskManager.getSampleDataStatus({
        sampleType,
        esClient,
        soClient,
      });

      expect(result).toEqual({
        status: 'error',
        taskId,
        error: 'boom',
      });
      expect(taskManager.get).toHaveBeenCalledWith(taskId);
    });

    it('should return installed status when index exists', async () => {
      mockIndexManager.hasIndex.mockResolvedValue(true);

      const result = await sampleDataManager.getSampleDataStatus({
        sampleType,
        esClient,
        soClient,
      });

      expect(mockSavedObjectsManager.getDashboardId).toHaveBeenCalledWith(soClient, sampleType);
      expect(result).toEqual({
        status: 'installed',
        indexName: expectedIndexName,
        dashboardId: 'test-dashboard-id',
      });
    });

    it('should return uninstalled status when index does not exist', async () => {
      mockIndexManager.hasIndex.mockResolvedValue(false);

      const result = await sampleDataManager.getSampleDataStatus({
        sampleType,
        esClient,
        soClient,
      });

      expect(result).toEqual({
        status: 'uninstalled',
      });
    });

    it('should handle elasticsearch client errors gracefully', async () => {
      const error = new Error('Elasticsearch error');
      mockIndexManager.hasIndex.mockRejectedValue(error);

      const result = await sampleDataManager.getSampleDataStatus({
        sampleType,
        esClient,
        soClient,
      });

      expect(logger.warn).toHaveBeenCalledWith(
        `Failed to check if sample data is installed for [${sampleType}]: Elasticsearch error`
      );
      expect(result).toEqual({
        status: 'uninstalled',
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle full installation workflow', async () => {
      const sampleType = 'elasticsearch_documentation' as DatasetSampleType;
      const expectedIndexName = 'kibana_sample_data_elasticsearch_documentation';

      // Check initial status
      mockIndexManager.hasIndex.mockResolvedValue(false);
      let status = await sampleDataManager.getSampleDataStatus({
        sampleType,
        esClient,
        soClient,
      });
      expect(status.status).toBe('uninstalled');

      // Install sample data
      const result = await sampleDataManager.installSampleData({
        sampleType,
        esClient,
        soClient,
        soImporter,
      });
      expect(result).toEqual({
        indexName: expectedIndexName,
        dashboardId: 'test-dashboard-id',
      });

      // Check status after installation
      mockIndexManager.hasIndex.mockResolvedValue(true);
      status = await sampleDataManager.getSampleDataStatus({
        sampleType,
        esClient,
        soClient,
      });
      expect(status.status).toBe('installed');
      expect(status.indexName).toBe(expectedIndexName);
      expect(status.dashboardId).toBe('test-dashboard-id');
    });
  });
});
