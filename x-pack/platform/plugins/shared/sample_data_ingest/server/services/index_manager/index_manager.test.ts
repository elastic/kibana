/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    createIndex: jest.fn(),
    populateIndex: jest.fn(),
    ensureDefaultElserDeployed: jest.fn(),
    isLegacySemanticTextVersion: jest.fn(),
  };
});

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { IndexManager } from './index_manager';
import type { ZipArchive } from '../types';
import {
  createIndex,
  populateIndex,
  ensureDefaultElserDeployed,
  isLegacySemanticTextVersion,
} from './utils';

const createIndexMock = createIndex as jest.MockedFunction<typeof createIndex>;
const populateIndexMock = populateIndex as jest.MockedFunction<typeof populateIndex>;
const ensureDefaultElserDeployedMock = ensureDefaultElserDeployed as jest.MockedFunction<
  typeof ensureDefaultElserDeployed
>;
const isLegacySemanticTextVersionMock = isLegacySemanticTextVersion as jest.MockedFunction<
  typeof isLegacySemanticTextVersion
>;

describe('IndexManager', () => {
  let logger: MockedLogger;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let indexManager: IndexManager;

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

  const elserInferenceId = defaultInferenceEndpoints.ELSER;

  beforeEach(() => {
    logger = loggerMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();

    indexManager = new IndexManager({
      elserInferenceId,
      logger,
      isServerlessPlatform: false,
    });

    createIndexMock.mockResolvedValue(undefined);
    populateIndexMock.mockResolvedValue(undefined);
    ensureDefaultElserDeployedMock.mockResolvedValue(undefined);
    isLegacySemanticTextVersionMock.mockReturnValue(false);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createAndPopulateIndex', () => {
    const indexName = 'test-index';

    it('should create and populate index successfully with default ELSER', async () => {
      await indexManager.createAndPopulateIndex({
        indexName,
        mappings: mockMappings,
        manifest: mockManifest,
        archive: mockArchive,
        esClient,
      });

      expect(ensureDefaultElserDeployedMock).toHaveBeenCalledWith({
        client: esClient,
      });

      expect(isLegacySemanticTextVersionMock).toHaveBeenCalledWith('2.0.0');

      expect(createIndexMock).toHaveBeenCalledWith({
        indexName,
        mappings: mockMappings,
        legacySemanticText: false,
        esClient,
        elserInferenceId,
        log: logger,
        isServerless: false,
      });

      expect(populateIndexMock).toHaveBeenCalledWith({
        indexName,
        archive: mockArchive,
        legacySemanticText: false,
        esClient,
        elserInferenceId,
        log: logger,
      });
    });

    it('should create and populate index with custom inference ID without ELSER deployment', async () => {
      const customInferenceId = 'custom-inference-id';
      const customIndexManager = new IndexManager({
        elserInferenceId: customInferenceId,
        logger,
        isServerlessPlatform: true,
      });

      await customIndexManager.createAndPopulateIndex({
        indexName,
        mappings: mockMappings,
        manifest: mockManifest,
        archive: mockArchive,
        esClient,
      });

      expect(ensureDefaultElserDeployedMock).not.toHaveBeenCalled();

      expect(createIndexMock).toHaveBeenCalledWith({
        indexName,
        mappings: mockMappings,
        legacySemanticText: false,
        esClient,
        elserInferenceId: customInferenceId,
        log: logger,
        isServerless: true,
      });

      expect(populateIndexMock).toHaveBeenCalledWith({
        indexName,
        archive: mockArchive,
        legacySemanticText: false,
        esClient,
        elserInferenceId: customInferenceId,
        log: logger,
      });
    });

    it('should handle legacy semantic text version', async () => {
      isLegacySemanticTextVersionMock.mockReturnValue(true);

      await indexManager.createAndPopulateIndex({
        indexName,
        mappings: mockMappings,
        manifest: mockManifest,
        archive: mockArchive,
        esClient,
      });

      expect(createIndexMock).toHaveBeenCalledWith({
        indexName,
        mappings: mockMappings,
        legacySemanticText: true,
        esClient,
        elserInferenceId,
        log: logger,
        isServerless: false,
      });

      expect(populateIndexMock).toHaveBeenCalledWith({
        indexName,
        archive: mockArchive,
        legacySemanticText: true,
        esClient,
        elserInferenceId,
        log: logger,
      });
    });

    it('should handle ELSER deployment failure', async () => {
      const deploymentError = new Error('ELSER deployment failed');
      ensureDefaultElserDeployedMock.mockRejectedValue(deploymentError);

      await expect(
        indexManager.createAndPopulateIndex({
          indexName,
          mappings: mockMappings,
          manifest: mockManifest,
          archive: mockArchive,
          esClient,
        })
      ).rejects.toThrow('ELSER deployment failed');

      expect(createIndexMock).not.toHaveBeenCalled();
      expect(populateIndexMock).not.toHaveBeenCalled();
    });

    it('should handle index creation failure', async () => {
      const creationError = new Error('Index creation failed');
      createIndexMock.mockRejectedValue(creationError);

      await expect(
        indexManager.createAndPopulateIndex({
          indexName,
          mappings: mockMappings,
          manifest: mockManifest,
          archive: mockArchive,
          esClient,
        })
      ).rejects.toThrow('Index creation failed');

      expect(populateIndexMock).not.toHaveBeenCalled();
    });

    it('should handle index population failure', async () => {
      const populationError = new Error('Index population failed');
      populateIndexMock.mockRejectedValue(populationError);

      await expect(
        indexManager.createAndPopulateIndex({
          indexName,
          mappings: mockMappings,
          manifest: mockManifest,
          archive: mockArchive,
          esClient,
        })
      ).rejects.toThrow('Index population failed');

      expect(createIndexMock).toHaveBeenCalled();
    });

    it('should execute steps in correct order', async () => {
      const callOrder = (fn: { mock: { invocationCallOrder: number[] } }): number => {
        return fn.mock.invocationCallOrder[0];
      };

      await indexManager.createAndPopulateIndex({
        indexName,
        mappings: mockMappings,
        manifest: mockManifest,
        archive: mockArchive,
        esClient,
      });

      expect(callOrder(ensureDefaultElserDeployedMock)).toBeLessThan(callOrder(createIndexMock));
      expect(callOrder(createIndexMock)).toBeLessThan(callOrder(populateIndexMock));
    });
  });

  describe('deleteIndex', () => {
    const indexName = 'test-index';

    it('should delete index successfully', async () => {
      esClient.indices.delete.mockResolvedValue({} as any);

      await indexManager.deleteIndex({ indexName, esClient });

      expect(esClient.indices.delete).toHaveBeenCalledWith({ index: indexName }, { ignore: [404] });

      expect(logger.debug).toHaveBeenCalledWith(`Deleted index [${indexName}]`);
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should handle deletion failure gracefully', async () => {
      const deletionError = new Error('Deletion failed');
      esClient.indices.delete.mockRejectedValue(deletionError);

      await indexManager.deleteIndex({ indexName, esClient });

      expect(esClient.indices.delete).toHaveBeenCalledWith({ index: indexName }, { ignore: [404] });

      expect(logger.warn).toHaveBeenCalledWith(
        `Failed to delete index [${indexName}]: Deletion failed`
      );
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should ignore 404 errors when index does not exist', async () => {
      esClient.indices.delete.mockResolvedValue({} as any);

      await indexManager.deleteIndex({ indexName, esClient });

      expect(esClient.indices.delete).toHaveBeenCalledWith({ index: indexName }, { ignore: [404] });
    });
  });

  it('should initialize with correct properties', () => {
    const customLogger = loggerMock.create();
    const customInferenceId = 'custom-inference';

    const manager = new IndexManager({
      elserInferenceId: customInferenceId,
      logger: customLogger,
      isServerlessPlatform: false,
    });

    expect(manager).toBeInstanceOf(IndexManager);
  });
});
