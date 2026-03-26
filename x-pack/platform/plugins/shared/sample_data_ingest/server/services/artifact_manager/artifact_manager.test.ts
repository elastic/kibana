/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fetchArtifactVersionsMock,
  validateArtifactArchiveMock,
  downloadMock,
  openZipArchiveMock,
  loadMappingFileMock,
  loadManifestFileMock,
  majorMinorMock,
  latestVersionMock,
  deleteFileMock,
} from './artifact_manager.test.mocks';

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { getArtifactName } from '@kbn/product-doc-common';
import { DatasetSampleType } from '../../../common';
import { ArtifactManager } from './artifact_manager';

jest.mock('@kbn/fs');

const artifactsFolder = '/tmp/artifacts';
const artifactRepositoryUrl = 'https://artifacts.elastic.co';
const kibanaVersion = '8.16.3';

describe('ArtifactManager', () => {
  let logger: MockedLogger;
  let artifactManager: ArtifactManager;

  const mockArchive = {
    close: jest.fn(),
    entries: new Map(),
  };

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

  beforeEach(() => {
    logger = loggerMock.create();
    artifactManager = new ArtifactManager({
      artifactsFolder,
      artifactRepositoryUrl,
      kibanaVersion,
      logger,
    });

    majorMinorMock.mockImplementation((version: string) => {
      const [major, minor] = version.split('.');
      return `${major}.${minor}`;
    });

    fetchArtifactVersionsMock.mockResolvedValue({
      kibana: ['8.15', '8.16'],
      elasticsearch: ['8.14', '8.15', '8.16'],
    });

    openZipArchiveMock.mockResolvedValue(mockArchive);
    loadManifestFileMock.mockResolvedValue(mockManifest);
    loadMappingFileMock.mockResolvedValue(mockMappings);
    validateArtifactArchiveMock.mockImplementation(() => {});
    downloadMock.mockResolvedValue(undefined);
    latestVersionMock.mockImplementation((versions: string[]) => versions[versions.length - 1]);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('prepareArtifact', () => {
    it('should successfully prepare artifact when version matches current version', async () => {
      const expectedArtifactName = getArtifactName({
        productName: 'elasticsearch',
        productVersion: '8.16',
      });
      const expectedArtifactUrl = `${artifactRepositoryUrl}/${expectedArtifactName}`;
      const expectedArtifactPath = `${artifactsFolder}/${expectedArtifactName}`;

      downloadMock.mockResolvedValueOnce(expectedArtifactPath);

      const result = await artifactManager.prepareArtifact(DatasetSampleType.elasticsearch);

      expect(majorMinorMock).toHaveBeenCalledWith(kibanaVersion);
      expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
      });

      expect(downloadMock).toHaveBeenCalledWith(
        expectedArtifactUrl,
        expectedArtifactPath,
        'application/zip',
        undefined
      );

      expect(openZipArchiveMock).toHaveBeenCalledWith(expectedArtifactPath);
      expect(validateArtifactArchiveMock).toHaveBeenCalledWith(mockArchive);
      expect(loadManifestFileMock).toHaveBeenCalledWith(mockArchive);
      expect(loadMappingFileMock).toHaveBeenCalledWith(mockArchive);

      expect(result).toEqual({
        archive: mockArchive,
        manifest: mockManifest,
        mappings: mockMappings,
      });

      expect(logger.debug).toHaveBeenCalledWith(
        `Downloading artifact from [${expectedArtifactUrl}]`
      );
    });

    it('should use latest version when current version is not available', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({
        elasticsearch: ['8.14', '8.15', '8.17'],
      });

      latestVersionMock.mockReturnValue('8.17');

      await artifactManager.prepareArtifact(DatasetSampleType.elasticsearch);

      expect(latestVersionMock).toHaveBeenCalledWith(['8.14', '8.15', '8.17']);

      const expectedArtifactName = getArtifactName({
        productName: 'elasticsearch',
        productVersion: '8.17',
      });

      expect(downloadMock).toHaveBeenCalledWith(
        `${artifactRepositoryUrl}/${expectedArtifactName}`,
        `${artifactsFolder}/${expectedArtifactName}`,
        'application/zip',
        undefined
      );
    });

    it('should throw error when no versions are available for product', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({
        elasticsearch: [],
      });

      await expect(
        artifactManager.prepareArtifact(DatasetSampleType.elasticsearch)
      ).rejects.toThrow('No versions found for product [elasticsearch]');

      expect(downloadMock).not.toHaveBeenCalled();
    });

    it('should throw error when product is not found in versions', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({});

      await expect(
        artifactManager.prepareArtifact(DatasetSampleType.elasticsearch)
      ).rejects.toThrow('No versions found for product [elasticsearch]');
    });

    it('should cache artifact versions after first fetch', async () => {
      await artifactManager.prepareArtifact(DatasetSampleType.elasticsearch);
      await artifactManager.prepareArtifact(DatasetSampleType.elasticsearch);

      expect(fetchArtifactVersionsMock).toHaveBeenCalledTimes(1);
    });

    it('should handle download failure', async () => {
      const downloadError = new Error('Download failed');
      downloadMock.mockRejectedValue(downloadError);

      await expect(
        artifactManager.prepareArtifact(DatasetSampleType.elasticsearch)
      ).rejects.toThrow('Download failed');
    });

    it('should handle archive validation failure', async () => {
      const validationError = new Error('Invalid archive');
      validateArtifactArchiveMock.mockImplementation(() => {
        throw validationError;
      });

      await expect(
        artifactManager.prepareArtifact(DatasetSampleType.elasticsearch)
      ).rejects.toThrow('Invalid archive');
    });

    it('should handle manifest loading failure', async () => {
      const manifestError = new Error('Failed to load manifest');
      loadManifestFileMock.mockRejectedValue(manifestError);

      await expect(
        artifactManager.prepareArtifact(DatasetSampleType.elasticsearch)
      ).rejects.toThrow('Failed to load manifest');
    });

    it('should handle mappings loading failure', async () => {
      const mappingsError = new Error('Failed to load mappings');
      loadMappingFileMock.mockRejectedValue(mappingsError);

      await expect(
        artifactManager.prepareArtifact(DatasetSampleType.elasticsearch)
      ).rejects.toThrow('Failed to load mappings');
    });

    it('should load manifest and mappings in parallel', async () => {
      let manifestResolve: () => void;
      let mappingsResolve: () => void;

      const manifestPromise = new Promise<any>((resolve) => {
        manifestResolve = () => resolve(mockManifest);
      });

      const mappingsPromise = new Promise<any>((resolve) => {
        mappingsResolve = () => resolve(mockMappings);
      });

      loadManifestFileMock.mockReturnValue(manifestPromise);
      loadMappingFileMock.mockReturnValue(mappingsPromise);

      const preparePromise = artifactManager.prepareArtifact(DatasetSampleType.elasticsearch);

      manifestResolve!();
      mappingsResolve!();

      const result = await preparePromise;

      expect(result.manifest).toBe(mockManifest);
      expect(result.mappings).toBe(mockMappings);
    });

    it('should use correct product version format', async () => {
      majorMinorMock.mockReturnValue('8.16');

      fetchArtifactVersionsMock.mockResolvedValue({
        elasticsearch: ['8.16'],
      });

      await artifactManager.prepareArtifact(DatasetSampleType.elasticsearch);

      expect(majorMinorMock).toHaveBeenCalledWith('8.16');
    });
  });

  it('should initialize with correct properties', () => {
    new ArtifactManager({
      artifactsFolder: '/custom/path',
      artifactRepositoryUrl: 'https://custom.repo.com',
      kibanaVersion: '9.0.0',
      logger,
    });

    expect(majorMinorMock).toHaveBeenCalledWith('9.0.0');
  });

  describe('cleanup', () => {
    it('should delete downloaded files and clear the set', async () => {
      await artifactManager.prepareArtifact(DatasetSampleType.elasticsearch);

      await artifactManager.cleanup();

      const expectedArtifactName = getArtifactName({
        productName: 'elasticsearch',
        productVersion: '8.16',
      });
      const expectedArtifactPath = `${artifactsFolder}/${expectedArtifactName}`;

      expect(deleteFileMock).toHaveBeenCalledWith(expectedArtifactPath);
      expect(deleteFileMock).toHaveBeenCalledTimes(1);
    });
  });
});
