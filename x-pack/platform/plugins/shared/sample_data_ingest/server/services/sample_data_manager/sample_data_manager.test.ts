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

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { DatasetSampleType } from '../../../common';
import { SampleDataManager } from './sample_data_manager';
import { ArtifactManager } from '../artifact_manager';
import { IndexManager } from '../index_manager';
import type { ZipArchive } from '../types';

const MockedArtifactManager = ArtifactManager as jest.MockedClass<typeof ArtifactManager>;
const MockedIndexManager = IndexManager as jest.MockedClass<typeof IndexManager>;

describe('SampleDataManager', () => {
  let logger: MockedLogger;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let sampleDataManager: SampleDataManager;
  let mockArtifactManager: jest.Mocked<ArtifactManager>;
  let mockIndexManager: jest.Mocked<IndexManager>;

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

    MockedArtifactManager.mockImplementation(() => mockArtifactManager);
    MockedIndexManager.mockImplementation(() => mockIndexManager);

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
    const sampleType = 'kibana' as DatasetSampleType;
    const expectedIndexName = 'kibana_sample_data_kibana';

    it('should install sample data successfully', async () => {
      const result = await sampleDataManager.installSampleData({ sampleType, esClient });

      expect(mockIndexManager.hasIndex).toHaveBeenCalledWith({
        indexName: expectedIndexName,
        esClient,
      });
      expect(mockArtifactManager.prepareArtifact).toHaveBeenCalledWith(sampleType);
      expect(mockIndexManager.createAndPopulateIndex).toHaveBeenCalledWith({
        indexName: expectedIndexName,
        mappings: mockMappings,
        manifest: mockManifest,
        archive: mockArchive,
        esClient,
      });
      expect(mockArtifactManager.cleanup).toHaveBeenCalled();

      expect(result).toBe(expectedIndexName);
      expect(logger.info).toHaveBeenCalledWith(`Installing sample data for [${sampleType}]`);
      expect(logger.info).toHaveBeenCalledWith(
        `Sample data installation successful for [${sampleType}]`
      );
    });

    it('should call cleanup when artifact preparation fails', async () => {
      const error = new Error('Artifact preparation failed');
      mockArtifactManager.prepareArtifact.mockRejectedValue(error);

      await expect(sampleDataManager.installSampleData({ sampleType, esClient })).rejects.toThrow(
        'Artifact preparation failed'
      );

      expect(mockArtifactManager.cleanup).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Sample data installation failed for [${sampleType}]: Artifact preparation failed`
      );
      expect(mockIndexManager.createAndPopulateIndex).not.toHaveBeenCalled();
    });

    it('should call cleanup when index creation fails', async () => {
      const error = new Error('Index creation failed');
      mockIndexManager.createAndPopulateIndex.mockRejectedValue(error);

      await expect(sampleDataManager.installSampleData({ sampleType, esClient })).rejects.toThrow(
        'Index creation failed'
      );

      expect(mockArtifactManager.cleanup).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Sample data installation failed for [${sampleType}]: Index creation failed`
      );
    });

    it('should delete index when installation fails', async () => {
      const error = new Error('Installation failed');
      mockIndexManager.createAndPopulateIndex.mockRejectedValue(error);

      await expect(sampleDataManager.installSampleData({ sampleType, esClient })).rejects.toThrow(
        'Installation failed'
      );

      expect(mockIndexManager.deleteIndex).toHaveBeenCalledWith({
        indexName: expectedIndexName,
        esClient,
      });
      expect(mockIndexManager.deleteIndex).toHaveBeenCalled();
    });

    it('should handle different sample types correctly', async () => {
      const elasticsearchSampleType = 'elasticsearch' as DatasetSampleType;
      const expectedElasticsearchIndexName = 'kibana_sample_data_elasticsearch';

      await sampleDataManager.installSampleData({ sampleType: elasticsearchSampleType, esClient });

      expect(mockArtifactManager.prepareArtifact).toHaveBeenCalledWith(elasticsearchSampleType);
      expect(mockIndexManager.createAndPopulateIndex).toHaveBeenCalledWith({
        indexName: expectedElasticsearchIndexName,
        mappings: mockMappings,
        manifest: mockManifest,
        archive: mockArchive,
        esClient,
      });
    });

    it('should not install anything if index already exists', async () => {
      mockIndexManager.hasIndex.mockResolvedValue(true);

      const result = await sampleDataManager.installSampleData({ sampleType, esClient });

      expect(mockIndexManager.hasIndex).toHaveBeenCalledWith({
        indexName: expectedIndexName,
        esClient,
      });
      expect(result).toBe(expectedIndexName);
      expect(mockArtifactManager.prepareArtifact).not.toHaveBeenCalled();
      expect(mockIndexManager.createAndPopulateIndex).not.toHaveBeenCalled();
      expect(mockIndexManager.deleteIndex).not.toHaveBeenCalled();
      expect(mockArtifactManager.cleanup).toHaveBeenCalled();
    });
  });

  describe('removeSampleData', () => {
    it('should remove sample data successfully', async () => {
      const sampleType = 'kibana' as DatasetSampleType;
      const expectedIndexName = 'kibana_sample_data_kibana';

      await sampleDataManager.removeSampleData({ sampleType, esClient });

      expect(mockIndexManager.deleteIndex).toHaveBeenCalledWith({
        indexName: expectedIndexName,
        esClient,
      });
    });

    it('should handle different sample types', async () => {
      const sampleType = 'elasticsearch' as DatasetSampleType;
      const expectedIndexName = 'kibana_sample_data_elasticsearch';

      await sampleDataManager.removeSampleData({ sampleType, esClient });

      expect(mockIndexManager.deleteIndex).toHaveBeenCalledWith({
        indexName: expectedIndexName,
        esClient,
      });
    });
  });

  describe('getSampleDataStatus', () => {
    const sampleType = 'kibana' as DatasetSampleType;
    const expectedIndexName = 'kibana_sample_data_kibana';

    it('should return installed status when index exists', async () => {
      mockIndexManager.hasIndex.mockResolvedValue(true);

      const result = await sampleDataManager.getSampleDataStatus({ sampleType, esClient });

      expect(result).toEqual({
        status: 'installed',
        indexName: expectedIndexName,
      });
    });

    it('should return uninstalled status when index does not exist', async () => {
      mockIndexManager.hasIndex.mockResolvedValue(false);

      const result = await sampleDataManager.getSampleDataStatus({ sampleType, esClient });

      expect(result).toEqual({
        status: 'uninstalled',
        indexName: undefined,
      });
    });

    it('should handle elasticsearch client errors gracefully', async () => {
      const error = new Error('Elasticsearch error');
      mockIndexManager.hasIndex.mockRejectedValue(error);

      const result = await sampleDataManager.getSampleDataStatus({ sampleType, esClient });

      expect(logger.warn).toHaveBeenCalledWith(
        `Failed to check sample data status for [${sampleType}]: Elasticsearch error`
      );
      expect(result).toEqual({
        status: 'uninstalled',
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle full installation workflow', async () => {
      const sampleType = 'kibana' as DatasetSampleType;

      // Check initial status
      esClient.indices.exists.mockResolvedValue(false);
      let status = await sampleDataManager.getSampleDataStatus({ sampleType, esClient });
      expect(status.status).toBe('uninstalled');

      // Install sample data
      const indexName = await sampleDataManager.installSampleData({ sampleType, esClient });
      expect(indexName).toBe('kibana_sample_data_kibana');

      // Check status after installation
      mockIndexManager.hasIndex.mockResolvedValue(true);
      status = await sampleDataManager.getSampleDataStatus({ sampleType, esClient });
      expect(status.status).toBe('installed');
      expect(status.indexName).toBe('kibana_sample_data_kibana');
    });
  });
});
