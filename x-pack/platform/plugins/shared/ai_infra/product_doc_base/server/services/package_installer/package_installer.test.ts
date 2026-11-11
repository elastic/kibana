/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  downloadToDiskMock,
  createIndexMock,
  populateIndexMock,
  loadMappingFileMock,
  loadManifestFileMock,
  openZipArchiveMock,
  validateArtifactArchiveMock,
  validateOpenApiArtifactArchiveMock,
  fetchArtifactVersionsMock,
  fetchSecurityLabsVersionsMock,
  ensureDefaultElserDeployedMock,
  ensureInferenceDeployedMock,
  checkArtifactAvailableMock,
  removeArtifactFileMock,
  logArtifactsFolderUsageMock,
  purgeArtifactsFolderMock,
} from './package_installer.test.mocks';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { pathToFileURL } from 'url';
import { cloneDeep } from 'lodash';
import type { ProductName } from '@kbn/product-doc-common';
import {
  getArtifactName,
  getProductDocIndexName,
  getSecurityLabsArtifactName,
  getSecurityLabsIndexName,
  DocumentationProduct,
  ResourceTypes,
} from '@kbn/product-doc-common';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { installClientMock } from '../doc_install_status/service.mock';
import type { ProductInstallState } from '../../../common/install_status';
import { PackageInstaller } from './package_installer';
import { ArtifactNotFoundError } from './utils/download';
import { resolveArtifactsFolderPath } from './utils/artifacts_folder';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

const artifactsFolder = '/lost';
const artifactsFolderPath = resolveArtifactsFolderPath(artifactsFolder);
const downloadedPath = (artifactName: string) => `${artifactsFolderPath}/${artifactName}`;
const bundledPath = (artifactName: string) =>
  `/usr/share/kibana/node_modules/@kbn/product-doc-base-plugin/target/bundled_artifacts/${artifactName}`;
const artifactRepositoryUrl = 'https://repository.com';
const artifactRepositoryProxyUrl = 'http://proxy.example.com:3128';
const kibanaVersion = '8.16.3';

const callOrder = (fn: { mock: { invocationCallOrder: number[] } }): number => {
  return fn.mock.invocationCallOrder[0];
};

const TEST_FORMAT_VERSION = '2.0.0';

// Repository listing with the given versions; products with versions are the published ones
const repositoryVersions = (
  versions: Partial<Record<ProductName | 'openapi', string[]>>,
  publishedProducts: Array<ProductName | 'openapi'> = (
    Object.keys(versions) as Array<ProductName | 'openapi'>
  ).filter((product) => versions[product]?.length)
) => ({
  versions: {
    ...Object.fromEntries(
      [...Object.values(DocumentationProduct), 'openapi'].map((product) => [product, []])
    ),
    ...versions,
  },
  publishedProducts,
});

describe('PackageInstaller', () => {
  let logger: MockedLogger;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let productDocClient: ReturnType<typeof installClientMock.create>;

  let packageInstaller: PackageInstaller;

  beforeEach(() => {
    logger = loggerMock.create();
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    productDocClient = installClientMock.create();
    packageInstaller = new PackageInstaller({
      artifactsFolder,
      logger,
      esClient,
      productDocClient,
      artifactRepositoryUrl,
      kibanaVersion,
    });

    loadManifestFileMock.mockResolvedValue({
      formatVersion: TEST_FORMAT_VERSION,
      productName: 'kibana',
      productVersion: '8.17',
    });

    validateArtifactArchiveMock.mockReturnValue({ valid: true });
    validateOpenApiArtifactArchiveMock.mockReturnValue({ valid: true });
    checkArtifactAvailableMock.mockResolvedValue(undefined);
    productDocClient.getInstallationStatusOrThrow.mockResolvedValue({} as never);
    productDocClient.getSecurityLabsInstallationStatus.mockResolvedValue({ status: 'uninstalled' });
    productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({ status: 'uninstalled' });
  });

  afterEach(() => {
    downloadToDiskMock.mockReset();
    createIndexMock.mockReset();
    populateIndexMock.mockReset();
    loadMappingFileMock.mockReset();
    loadManifestFileMock.mockReset();
    openZipArchiveMock.mockReset();
    validateArtifactArchiveMock.mockReset();
    validateOpenApiArtifactArchiveMock.mockReset();
    fetchArtifactVersionsMock.mockReset();
    fetchSecurityLabsVersionsMock.mockReset();
    ensureDefaultElserDeployedMock.mockReset();
    ensureInferenceDeployedMock.mockReset();
    checkArtifactAvailableMock.mockReset();
    removeArtifactFileMock.mockReset();
    logArtifactsFolderUsageMock.mockReset();
    purgeArtifactsFolderMock.mockReset();
  });

  describe('installPackage', () => {
    it('deletes the downloaded artifact after a successful install', async () => {
      openZipArchiveMock.mockResolvedValue({ close: jest.fn() });
      loadMappingFileMock.mockResolvedValue({ properties: {} });
      downloadToDiskMock.mockResolvedValue(downloadedPath('kb-product-doc-kibana-8.16.zip'));

      await packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' });

      expect(removeArtifactFileMock).toHaveBeenCalledWith(
        downloadedPath('kb-product-doc-kibana-8.16.zip'),
        logger
      );
      expect(logArtifactsFolderUsageMock).toHaveBeenCalledTimes(1);
    });

    it('reads an artifact of a local repository in place and leaves it after the install', async () => {
      const bundled = bundledPath('kb-product-doc-kibana-8.16.zip');
      openZipArchiveMock.mockResolvedValue({ close: jest.fn() });
      loadMappingFileMock.mockResolvedValue({ properties: {} });
      downloadToDiskMock.mockResolvedValue(bundled);

      await packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' });

      expect(openZipArchiveMock).toHaveBeenCalledWith(bundled);
      expect(removeArtifactFileMock).not.toHaveBeenCalled();
      expect(logArtifactsFolderUsageMock).toHaveBeenCalledTimes(1);
    });

    it('does not delete an artifact outside the artifacts folder when the install fails', async () => {
      downloadToDiskMock.mockResolvedValue(bundledPath('kb-product-doc-kibana-8.16.zip'));
      openZipArchiveMock.mockRejectedValue(new Error('corrupt archive'));

      await expect(
        packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' })
      ).rejects.toThrow('corrupt archive');

      expect(removeArtifactFileMock).not.toHaveBeenCalled();
    });

    it('deletes the existing index only after the archive has been downloaded and validated', async () => {
      openZipArchiveMock.mockResolvedValue({ close: jest.fn() });
      loadMappingFileMock.mockResolvedValue({ properties: {} });
      downloadToDiskMock.mockResolvedValue('/data/lost/kb-product-doc-kibana-8.16.zip');

      await packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' });

      expect(esClient.indices.delete).toHaveBeenCalledWith(
        { index: getProductDocIndexName('kibana') },
        { ignore: [404] }
      );
      expect(callOrder(validateArtifactArchiveMock)).toBeLessThan(
        callOrder(esClient.indices.delete)
      );
      expect(callOrder(esClient.indices.delete)).toBeLessThan(callOrder(createIndexMock));
    });

    it('keeps the existing index when the archive fails validation', async () => {
      openZipArchiveMock.mockResolvedValue({ close: jest.fn() });
      downloadToDiskMock.mockResolvedValue('/data/lost/kb-product-doc-kibana-8.16.zip');
      validateArtifactArchiveMock.mockReturnValue({ valid: false, error: 'truncated' });

      await expect(
        packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' })
      ).rejects.toThrow('Artifact archive validation failed: truncated');

      expect(esClient.indices.delete).not.toHaveBeenCalled();
      expect(createIndexMock).not.toHaveBeenCalled();
    });

    it('only marks the status as installing once the archive is ready to replace the index', async () => {
      openZipArchiveMock.mockResolvedValue({ close: jest.fn() });
      loadMappingFileMock.mockResolvedValue({ properties: {} });
      downloadToDiskMock.mockResolvedValue('/data/lost/kb-product-doc-kibana-8.16.zip');

      await packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' });

      expect(callOrder(validateArtifactArchiveMock)).toBeLessThan(
        callOrder(productDocClient.setInstallationStarted)
      );
      expect(callOrder(productDocClient.setInstallationStarted)).toBeLessThan(
        callOrder(esClient.indices.delete)
      );
    });

    it('keeps a previously installed status when the new archive cannot be prepared', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
      } as never);
      downloadToDiskMock.mockRejectedValue(new Error('network down'));

      await expect(
        packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' })
      ).rejects.toThrow('network down');

      expect(productDocClient.setInstallationStarted).not.toHaveBeenCalled();
      expect(productDocClient.setInstallationFailed).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Keeping the installed'));
    });

    it('propagates a status read failure instead of treating it as a fresh install', async () => {
      productDocClient.getInstallationStatusOrThrow.mockRejectedValue(new Error('es unavailable'));

      await expect(
        packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' })
      ).rejects.toThrow('es unavailable');

      expect(downloadToDiskMock).not.toHaveBeenCalled();
      expect(productDocClient.setInstallationFailed).not.toHaveBeenCalled();
    });

    it('marks a fresh install as failed when the archive cannot be prepared', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as never);
      downloadToDiskMock.mockRejectedValue(new Error('network down'));

      await expect(
        packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' })
      ).rejects.toThrow('network down');

      expect(productDocClient.setInstallationFailed).toHaveBeenCalledWith(
        'kibana',
        'network down',
        defaultInferenceEndpoints.ELSER
      );
    });

    it('marks the install as failed when it fails after the index was replaced', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
      } as never);
      openZipArchiveMock.mockResolvedValue({ close: jest.fn() });
      loadMappingFileMock.mockResolvedValue({ properties: {} });
      downloadToDiskMock.mockResolvedValue('/data/lost/kb-product-doc-kibana-8.16.zip');
      populateIndexMock.mockRejectedValue(new Error('bulk failed'));

      await expect(
        packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' })
      ).rejects.toThrow('bulk failed');

      expect(productDocClient.setInstallationFailed).toHaveBeenCalledTimes(1);
    });

    it('deletes the downloaded artifact when the install fails', async () => {
      downloadToDiskMock.mockResolvedValue(downloadedPath('kb-product-doc-kibana-8.16.zip'));
      openZipArchiveMock.mockRejectedValue(new Error('corrupt archive'));

      await expect(
        packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' })
      ).rejects.toThrow('corrupt archive');

      expect(removeArtifactFileMock).toHaveBeenCalledWith(
        downloadedPath('kb-product-doc-kibana-8.16.zip'),
        logger
      );
    });

    it('calls the steps with the right parameters', async () => {
      const zipArchive = {
        close: jest.fn(),
      };
      openZipArchiveMock.mockResolvedValue(zipArchive);

      const artifactName = getArtifactName({
        productName: 'kibana',
        productVersion: '8.16',
      });

      downloadToDiskMock.mockResolvedValue(`${artifactsFolder}/${artifactName}`);

      const mappings = {
        properties: {
          semantic: {
            inference_id: '.elser',
            type: 'semantic_text',
            model_settings: {},
          },
        },
      };
      loadMappingFileMock.mockResolvedValue(mappings);

      await packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' });

      const indexName = getProductDocIndexName('kibana');

      expect(ensureDefaultElserDeployedMock).toHaveBeenCalledTimes(1);

      expect(downloadToDiskMock).toHaveBeenCalledTimes(1);
      expect(downloadToDiskMock).toHaveBeenCalledWith(
        `${artifactRepositoryUrl}/${artifactName}`,
        `${artifactsFolder}/${artifactName}`,
        undefined
      );

      expect(openZipArchiveMock).toHaveBeenCalledTimes(1);
      expect(openZipArchiveMock).toHaveBeenCalledWith(`${artifactsFolder}/${artifactName}`);

      expect(loadMappingFileMock).toHaveBeenCalledTimes(1);
      expect(loadMappingFileMock).toHaveBeenCalledWith(zipArchive);

      expect(loadManifestFileMock).toHaveBeenCalledTimes(1);
      expect(loadManifestFileMock).toHaveBeenCalledWith(zipArchive);

      expect(createIndexMock).toHaveBeenCalledTimes(1);
      const modifiedMappings = cloneDeep(mappings);
      modifiedMappings.properties.semantic.inference_id = defaultInferenceEndpoints.ELSER;
      expect(createIndexMock).toHaveBeenCalledWith({
        indexName,
        mappings: modifiedMappings,
        manifestVersion: TEST_FORMAT_VERSION,
        esClient,
        log: logger,
      });

      expect(populateIndexMock).toHaveBeenCalledTimes(1);
      expect(populateIndexMock).toHaveBeenCalledWith({
        indexName,
        archive: zipArchive,
        manifestVersion: TEST_FORMAT_VERSION,
        inferenceId: defaultInferenceEndpoints.ELSER,
        esClient,
        log: logger,
      });

      expect(productDocClient.setInstallationSuccessful).toHaveBeenCalledTimes(1);
      expect(productDocClient.setInstallationSuccessful).toHaveBeenCalledWith(
        'kibana',
        indexName,
        defaultInferenceEndpoints.ELSER
      );

      expect(zipArchive.close).toHaveBeenCalledTimes(1);

      expect(productDocClient.setInstallationFailed).not.toHaveBeenCalled();
    });

    it('does not deploy local ELSER when installing with ELSER in EIS', async () => {
      const zipArchive = { close: jest.fn() };
      openZipArchiveMock.mockResolvedValue(zipArchive);
      const artifactName = getArtifactName({
        productName: 'kibana',
        productVersion: '8.16',
        inferenceId: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
      });
      downloadToDiskMock.mockResolvedValue(`${artifactsFolder}/${artifactName}`);
      loadMappingFileMock.mockResolvedValue({
        properties: { semantic: { inference_id: '.elser', type: 'semantic_text' } },
      });

      await packageInstaller.installPackage({
        productName: 'kibana',
        productVersion: '8.16',
        customInference: {
          inference_id: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
          task_type: 'sparse_embedding' as InferenceTaskType,
          service: 'elastic',
          service_settings: {},
        },
      });

      expect(ensureDefaultElserDeployedMock).not.toHaveBeenCalled();
      expect(ensureInferenceDeployedMock).toHaveBeenCalledTimes(1);
      expect(ensureInferenceDeployedMock).toHaveBeenCalledWith({
        client: esClient,
        inferenceId: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
      });
      expect(productDocClient.setInstallationSuccessful).toHaveBeenCalledWith(
        'kibana',
        getProductDocIndexName('kibana', defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID),
        defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID
      );
    });

    it('rejects a custom inference endpoint that is not a text embedding model', async () => {
      await expect(
        packageInstaller.installPackage({
          productName: 'kibana',
          productVersion: '8.16',
          customInference: {
            inference_id: 'my-reranker',
            task_type: 'rerank' as InferenceTaskType,
            service: 'elastic',
            service_settings: {},
          },
        })
      ).rejects.toThrow(/task type rerank is not supported/);

      expect(ensureDefaultElserDeployedMock).not.toHaveBeenCalled();
      expect(ensureInferenceDeployedMock).not.toHaveBeenCalled();
    });

    it('executes the steps in the right order', async () => {
      await packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' });

      expect(callOrder(ensureDefaultElserDeployedMock)).toBeLessThan(callOrder(downloadToDiskMock));
      expect(callOrder(downloadToDiskMock)).toBeLessThan(callOrder(openZipArchiveMock));
      expect(callOrder(openZipArchiveMock)).toBeLessThan(callOrder(loadMappingFileMock));
      expect(callOrder(loadMappingFileMock)).toBeLessThan(callOrder(createIndexMock));
      expect(callOrder(loadManifestFileMock)).toBeLessThan(callOrder(createIndexMock));
      expect(callOrder(createIndexMock)).toBeLessThan(callOrder(populateIndexMock));
      expect(callOrder(populateIndexMock)).toBeLessThan(
        callOrder(productDocClient.setInstallationSuccessful)
      );
    });

    it('closes the archive and calls setInstallationFailed if the installation fails', async () => {
      const zipArchive = {
        close: jest.fn(),
      };
      openZipArchiveMock.mockResolvedValue(zipArchive);

      populateIndexMock.mockImplementation(async () => {
        throw new Error('something bad');
      });

      await expect(
        packageInstaller.installPackage({
          productName: 'kibana',
          productVersion: '8.16',
          customInference: {
            inference_id: defaultInferenceEndpoints.ELSER,
            task_type: 'text_embedding' as InferenceTaskType,
            service: 'elser',
            service_settings: {},
          },
        })
      ).rejects.toThrow();

      expect(productDocClient.setInstallationSuccessful).not.toHaveBeenCalled();

      expect(zipArchive.close).toHaveBeenCalledTimes(1);

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during documentation installation')
      );

      expect(productDocClient.setInstallationFailed).toHaveBeenCalledTimes(1);
      expect(productDocClient.setInstallationFailed).toHaveBeenCalledWith(
        'kibana',
        'something bad',
        defaultInferenceEndpoints.ELSER
      );
    });
  });

  describe('installProduct', () => {
    it('installs the version selected for the current stack version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({
          kibana: ['8.15', '8.16'],
        })
      );
      jest.spyOn(packageInstaller, 'installPackage').mockResolvedValue(undefined as never);

      await expect(packageInstaller.installProduct({ productName: 'kibana' })).resolves.toBe(true);

      expect(packageInstaller.installPackage).toHaveBeenCalledTimes(1);
      expect(packageInstaller.installPackage).toHaveBeenCalledWith({
        productName: 'kibana',
        productVersion: '8.16',
      });
    });

    it('warns and skips when the repository has no version for the product', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: [] }));
      jest.spyOn(packageInstaller, 'installPackage');

      await expect(packageInstaller.installProduct({ productName: 'kibana' })).resolves.toBe(false);

      expect(packageInstaller.installPackage).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('No version found for product [kibana]');
    });

    it('records a failed installation when the product is only published for other inference IDs', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: [] }, ['kibana']));
      esClient.inference.get.mockResolvedValue({
        endpoints: [
          { inference_id: '.jina-embeddings-v5-text-small', task_type: 'text_embedding' },
        ],
      } as never);
      jest.spyOn(packageInstaller, 'installPackage');

      await expect(
        packageInstaller.installProduct({
          productName: 'kibana',
          inferenceId: '.jina-embeddings-v5-text-small',
        })
      ).resolves.toBe(false);

      expect(packageInstaller.installPackage).not.toHaveBeenCalled();
      expect(productDocClient.setInstallationFailed).toHaveBeenCalledWith(
        'kibana',
        expect.stringContaining(
          'No documentation artifact available for product [kibana]/[8.16] for Inference ID [.jina-embeddings-v5-text-small]'
        ),
        '.jina-embeddings-v5-text-small'
      );
      expect(logger.warn).not.toHaveBeenCalledWith('No version found for product [kibana]');
    });

    it('records a failed installation when no listed version has an artifact for the inference ID', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: ['8.15', '8.16'] }));
      checkArtifactAvailableMock.mockRejectedValue(new ArtifactNotFoundError('missing'));
      jest.spyOn(packageInstaller, 'installPackage');

      await expect(packageInstaller.installProduct({ productName: 'kibana' })).resolves.toBe(false);

      expect(packageInstaller.installPackage).not.toHaveBeenCalled();
      expect(productDocClient.setInstallationFailed).toHaveBeenCalledWith(
        'kibana',
        expect.stringContaining('No documentation artifact available for product [kibana]'),
        defaultInferenceEndpoints.ELSER
      );
    });

    it('keeps an installed status when the artifact of the inference ID is no longer published', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: [] }, ['kibana']));
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.16' },
      } as never);

      await expect(packageInstaller.installProduct({ productName: 'kibana' })).resolves.toBe(false);

      expect(productDocClient.setInstallationFailed).not.toHaveBeenCalled();
    });

    it('lists the versions of the default ELSER inference ID when none is given', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: ['8.16'] }));
      jest.spyOn(packageInstaller, 'installPackage').mockResolvedValue(undefined as never);

      await packageInstaller.installProduct({ productName: 'kibana' });

      expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
    });

    it('lists the versions of the given inference ID', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: ['8.16'] }));
      esClient.inference.get.mockResolvedValue({
        endpoints: [
          { inference_id: '.jina-embeddings-v5-text-small', task_type: 'text_embedding' },
        ],
      } as never);
      jest.spyOn(packageInstaller, 'installPackage').mockResolvedValue(undefined as never);

      await packageInstaller.installProduct({
        productName: 'kibana',
        inferenceId: '.jina-embeddings-v5-text-small',
      });

      expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
        inferenceId: '.jina-embeddings-v5-text-small',
      });
    });
  });

  describe('purgeArtifactsFolder', () => {
    it('purges the resolved artifacts folder', async () => {
      await expect(packageInstaller.purgeArtifactsFolder()).resolves.toBeUndefined();

      expect(purgeArtifactsFolderMock).toHaveBeenCalledWith(expect.stringMatching(/lost$/), logger);
    });
  });

  describe('installProductIfNeeded', () => {
    const since = new Date('2026-09-17T10:00:00.000Z');
    const params = { productName: 'kibana' as const, inferenceId: '.elser', since };

    beforeEach(() => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: ['8.15', '8.16'] }));
      jest.spyOn(packageInstaller, 'installPackage').mockResolvedValue(undefined as never);
    });

    it('installs a product that is not installed', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as never);

      await expect(packageInstaller.installProductIfNeeded(params)).resolves.toBe(true);
      expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
        inferenceId: '.elser',
      });
      expect(packageInstaller.installPackage).toHaveBeenCalledWith({
        productName: 'kibana',
        productVersion: '8.16',
        customInference: undefined,
      });
    });

    it('installs a product that is at an older version', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15', updatedAt: '2026-09-17T10:30:00.000Z' },
      } as never);

      await expect(packageInstaller.installProductIfNeeded(params)).resolves.toBe(true);
    });

    it('skips a product another task installed at the selected version after the request', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.16', updatedAt: '2026-09-17T10:30:00.000Z' },
      } as never);

      await expect(packageInstaller.installProductIfNeeded(params)).resolves.toBe(false);
      expect(packageInstaller.installPackage).not.toHaveBeenCalled();
    });

    it('reinstalls a product that was at the selected version before the request', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.16', updatedAt: '2026-09-17T09:00:00.000Z' },
      } as never);

      await expect(packageInstaller.installProductIfNeeded(params)).resolves.toBe(true);
    });

    it('compares against the installable fallback version, so a retry after a fallback install is skipped', async () => {
      checkArtifactAvailableMock.mockImplementation(async (url: string) => {
        if (url.includes('8.16')) {
          throw new ArtifactNotFoundError(url);
        }
      });
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15', updatedAt: '2026-09-17T10:30:00.000Z' },
      } as never);

      await expect(packageInstaller.installProductIfNeeded(params)).resolves.toBe(false);
      expect(packageInstaller.installPackage).not.toHaveBeenCalled();
    });

    it('installs the resolved fallback version directly', async () => {
      checkArtifactAvailableMock.mockImplementation(async (url: string) => {
        if (url.includes('8.16')) {
          throw new ArtifactNotFoundError(url);
        }
      });
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as never);

      await expect(packageInstaller.installProductIfNeeded(params)).resolves.toBe(true);
      expect(packageInstaller.installPackage).toHaveBeenCalledWith(
        expect.objectContaining({ productName: 'kibana', productVersion: '8.15' })
      );
    });

    it('skips without a status change when the product is absent from the repository', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: [] }));
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({} as never);

      await expect(packageInstaller.installProductIfNeeded(params)).resolves.toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('No version found for product [kibana]');
      expect(productDocClient.setInstallationFailed).not.toHaveBeenCalled();
      expect(packageInstaller.installPackage).not.toHaveBeenCalled();
    });

    it('records a failed installation when the product is only published for other inference IDs', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: [] }, ['kibana']));
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as never);

      await expect(packageInstaller.installProductIfNeeded(params)).resolves.toBe(false);
      expect(productDocClient.setInstallationFailed).toHaveBeenCalledWith(
        'kibana',
        expect.stringContaining('No documentation artifact available for product [kibana]'),
        '.elser'
      );
      expect(packageInstaller.installPackage).not.toHaveBeenCalled();
    });

    it('records a failed installation instead of throwing when no listed version is installable', async () => {
      checkArtifactAvailableMock.mockRejectedValue(new ArtifactNotFoundError('missing'));
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as never);

      await expect(packageInstaller.installProductIfNeeded(params)).resolves.toBe(false);
      expect(productDocClient.setInstallationFailed).toHaveBeenCalledWith(
        'kibana',
        expect.stringContaining('No documentation artifact available for product [kibana]'),
        '.elser'
      );
    });

    it('propagates status read failures', async () => {
      productDocClient.getInstallationStatusOrThrow.mockRejectedValue(new Error('es unavailable'));

      await expect(packageInstaller.installProductIfNeeded(params)).rejects.toThrow(
        'es unavailable'
      );
    });
  });

  describe('updateProductIfNeeded', () => {
    const since = new Date('2026-09-17T10:00:00.000Z');
    const params = { productName: 'kibana' as const, inferenceId: '.elser', since };

    beforeEach(() => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: ['8.15', '8.16'] }));
      jest.spyOn(packageInstaller, 'installPackage').mockResolvedValue(undefined as never);
    });

    it('installs when the installed version differs from the selected version', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
      } as never);

      await expect(packageInstaller.updateProductIfNeeded(params)).resolves.toBe(true);
      expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
        inferenceId: '.elser',
      });
      expect(packageInstaller.installPackage).toHaveBeenCalledWith({
        productName: 'kibana',
        productVersion: '8.16',
        customInference: undefined,
      });
    });

    it('skips when the product is already at the selected version', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.16' },
      } as never);

      await expect(packageInstaller.updateProductIfNeeded(params)).resolves.toBe(false);
      expect(packageInstaller.installPackage).not.toHaveBeenCalled();
    });

    it('installs when the installation at the selected version failed', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'error', version: '8.16' },
      } as never);

      await expect(packageInstaller.updateProductIfNeeded(params)).resolves.toBe(true);
      expect(packageInstaller.installPackage).toHaveBeenCalledWith(
        expect.objectContaining({ productName: 'kibana', productVersion: '8.16' })
      );
    });

    it('reinstalls a current version when forced and nobody refreshed it since the request', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.16', updatedAt: '2026-09-17T09:00:00.000Z' },
      } as never);

      await expect(
        packageInstaller.updateProductIfNeeded({ ...params, forceUpdate: true })
      ).resolves.toBe(true);
    });

    it('skips a forced update when another task installed the selected version after the request', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.16', updatedAt: '2026-09-17T10:30:00.000Z' },
      } as never);

      await expect(
        packageInstaller.updateProductIfNeeded({ ...params, forceUpdate: true })
      ).resolves.toBe(false);
      expect(packageInstaller.installPackage).not.toHaveBeenCalled();
    });

    it('skips a product that was uninstalled since the plan was computed', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as never);

      await expect(
        packageInstaller.updateProductIfNeeded({ ...params, forceUpdate: true })
      ).resolves.toBe(false);
    });

    it('propagates status read failures', async () => {
      productDocClient.getInstallationStatusOrThrow.mockRejectedValue(new Error('es unavailable'));

      await expect(packageInstaller.updateProductIfNeeded(params)).rejects.toThrow(
        'es unavailable'
      );
    });
  });

  describe('getRepositoryVersion', () => {
    it('reflects a local repository index that changed since the last call', async () => {
      const repositoryDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'product-doc-repository-'));
      const writeIndex = (lastModified: string) =>
        Fs.writeFileSync(
          Path.join(repositoryDir, 'index.xml'),
          `<ListBucketResult><Contents><Key>kb-product-doc-kibana-latest.zip</Key><LastModified>${lastModified}</LastModified></Contents></ListBucketResult>`
        );
      const localInstaller = new PackageInstaller({
        artifactsFolder,
        logger,
        esClient,
        productDocClient,
        artifactRepositoryUrl: pathToFileURL(repositoryDir).href,
        kibanaVersion,
      });
      try {
        writeIndex('2026-10-12T20:25:34.000Z');
        await expect(localInstaller.getRepositoryVersion()).resolves.toBe(
          '2026-10-12T20:25:34.000Z'
        );

        writeIndex('2026-11-01T00:00:00.000Z');
        await expect(localInstaller.getRepositoryVersion()).resolves.toBe(
          '2026-11-01T00:00:00.000Z'
        );
      } finally {
        Fs.rmSync(repositoryDir, { recursive: true, force: true });
      }
    });
  });

  describe('wasUninstalledSince', () => {
    const since = new Date('2026-09-17T10:00:00.000Z');
    const productDocs = { inferenceId: '.elser', since, resourceType: ResourceTypes.productDoc };
    const openApiSpec = { inferenceId: '.elser', since, resourceType: ResourceTypes.openapiSpec };

    it('propagates status read failures instead of reporting an uninstall', async () => {
      productDocClient.getInstallationStatusOrThrow.mockRejectedValue(new Error('es unavailable'));

      await expect(packageInstaller.wasUninstalledSince(productDocs)).rejects.toThrow(
        'es unavailable'
      );
    });

    it('returns true when a product was uninstalled after the given time', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15', updatedAt: '2026-09-17T10:05:00.000Z' },
        security: { status: 'uninstalled', updatedAt: '2026-09-17T10:01:00.000Z' },
      } as never);

      await expect(packageInstaller.wasUninstalledSince(productDocs)).resolves.toBe(true);
    });

    it('ignores an OpenAPI-only uninstall when checking product documentation', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15', updatedAt: '2026-09-17T10:05:00.000Z' },
      } as never);
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'uninstalled',
        updatedAt: '2026-09-17T10:02:00.000Z',
      });

      await expect(packageInstaller.wasUninstalledSince(productDocs)).resolves.toBe(false);
      expect(productDocClient.getOpenapiSpecInstallationStatus).not.toHaveBeenCalled();
    });

    it('returns true when the OpenAPI spec was uninstalled after the given time', async () => {
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'uninstalled',
        updatedAt: '2026-09-17T10:02:00.000Z',
      });

      await expect(packageInstaller.wasUninstalledSince(openApiSpec)).resolves.toBe(true);
      expect(productDocClient.getInstallationStatusOrThrow).not.toHaveBeenCalled();
    });

    it('propagates OpenAPI spec status read failures', async () => {
      productDocClient.getOpenapiSpecInstallationStatus.mockRejectedValue(
        new Error('es unavailable')
      );

      await expect(packageInstaller.wasUninstalledSince(openApiSpec)).rejects.toThrow(
        'es unavailable'
      );
    });

    it('returns false when the uninstall predates the given time or products have no status', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'uninstalled', updatedAt: '2026-09-17T09:00:00.000Z' },
        security: { status: 'uninstalled' },
        elasticsearch: { status: 'installing', updatedAt: '2026-09-17T10:05:00.000Z' },
      } as never);

      await expect(packageInstaller.wasUninstalledSince(productDocs)).resolves.toBe(false);
    });
  });

  describe('getProductsToUpdate', () => {
    it('returns installed products whose version differs from the selected version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({
          kibana: ['8.15', '8.16'],
          security: ['8.15', '8.16'],
          elasticsearch: ['8.16'],
          openapi: [],
        })
      );
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
        security: { status: 'installed', version: '8.16' },
        elasticsearch: { status: 'uninstalled' },
      } as Record<ProductName, ProductInstallState>);

      const products = await packageInstaller.getProductsToUpdate({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(products).toEqual(['kibana']);
      expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
    });

    it('returns products whose installation failed at the selected version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: ['8.16'] }));
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'error', version: '8.16' },
      } as Record<ProductName, ProductInstallState>);

      await expect(
        packageInstaller.getProductsToUpdate({ inferenceId: defaultInferenceEndpoints.ELSER })
      ).resolves.toEqual(['kibana']);
    });

    it('returns every installed product when forceUpdate is set', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({
          kibana: ['8.16'],
          security: ['8.16'],
          openapi: [],
        })
      );
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.16' },
        security: { status: 'installed', version: '8.16' },
        elasticsearch: { status: 'uninstalled' },
      } as Record<ProductName, ProductInstallState>);

      const products = await packageInstaller.getProductsToUpdate({
        inferenceId: defaultInferenceEndpoints.ELSER,
        forceUpdate: true,
      });

      expect(products).toEqual(['kibana', 'security']);
    });
  });

  describe('getProductsToUpdate with an unpublished selected artifact', () => {
    it('does not plan an update when the installable fallback version is already installed', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: ['8.15', '8.16'] }));
      checkArtifactAvailableMock.mockImplementation(async (url: string) => {
        if (url.includes('8.16')) {
          throw new ArtifactNotFoundError(url);
        }
      });
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
      } as never);

      await expect(
        packageInstaller.getProductsToUpdate({ inferenceId: defaultInferenceEndpoints.ELSER })
      ).resolves.toEqual([]);
    });

    it('skips a product with no installable artifact at all', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: ['8.16'] }));
      checkArtifactAvailableMock.mockRejectedValue(new ArtifactNotFoundError('missing'));
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
      } as never);

      await expect(
        packageInstaller.getProductsToUpdate({ inferenceId: defaultInferenceEndpoints.ELSER })
      ).resolves.toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no artifact available'));
    });
  });

  describe('ensureOpenApiSpecUpToDate', () => {
    it('does not reinstall when the installed version matches the selected version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ openapi: ['8.16'] }));
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '8.16',
      });
      jest.spyOn(packageInstaller, 'installOpenAPISpec').mockResolvedValue(undefined);

      await packageInstaller.ensureOpenApiSpecUpToDate({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(packageInstaller.installOpenAPISpec).not.toHaveBeenCalled();
      expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
    });

    it('installs when the installed version differs from the selected version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({ openapi: ['8.15', '8.16'] })
      );
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '8.15',
      });
      jest.spyOn(packageInstaller, 'installOpenAPISpec').mockResolvedValue(undefined);

      await packageInstaller.ensureOpenApiSpecUpToDate({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(packageInstaller.installOpenAPISpec).toHaveBeenCalledWith({
        version: '8.16',
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
    });

    it('skips when the repository has no OpenAPI version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ openapi: [] }));
      jest.spyOn(packageInstaller, 'installOpenAPISpec').mockResolvedValue(undefined);

      await packageInstaller.ensureOpenApiSpecUpToDate({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(packageInstaller.installOpenAPISpec).not.toHaveBeenCalled();
      expect(checkArtifactAvailableMock).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no version available'));
    });
  });

  describe('ensureOpenApiSpecUpToDate with an unpublished selected artifact', () => {
    const E5 = defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL;
    const selectedArtifactUrl = `${artifactRepositoryUrl}/kb-product-doc-openapi-8.16--${E5}.zip`;
    const fallbackArtifactUrl = `${artifactRepositoryUrl}/kb-product-doc-openapi-8.15--${E5}.zip`;

    beforeEach(() => {
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({ openapi: ['8.14', '8.15', '8.16'] })
      );
      checkArtifactAvailableMock.mockImplementation(async (url: string) => {
        if (url !== fallbackArtifactUrl) {
          throw new ArtifactNotFoundError(url);
        }
      });
      jest.spyOn(packageInstaller, 'installOpenAPISpec').mockResolvedValue(undefined);
    });

    it('does not reinstall when the installable fallback version is already installed', async () => {
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '8.15',
      });

      await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: E5 });

      expect(checkArtifactAvailableMock).toHaveBeenCalledWith(selectedArtifactUrl, undefined);
      expect(checkArtifactAvailableMock).toHaveBeenCalledWith(fallbackArtifactUrl, undefined);
      expect(packageInstaller.installOpenAPISpec).not.toHaveBeenCalled();
    });

    it('installs the fallback version once and records it when it is not installed yet', async () => {
      jest.restoreAllMocks();
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'uninstalled',
      });
      esClient.bulk.mockResolvedValue({ errors: false } as never);
      openZipArchiveMock.mockResolvedValue({
        close: jest.fn(),
        hasEntry: jest.fn().mockReturnValue(true),
        getEntryPaths: jest
          .fn()
          .mockReturnValue([
            'kibana/content/content-0.ndjson',
            'elasticsearch/content/content-0.ndjson',
          ]),
        getEntryContent: jest.fn().mockImplementation(async (entryPath: string) => {
          if (entryPath.endsWith('manifest.json')) {
            return Buffer.from(JSON.stringify({ formatVersion: TEST_FORMAT_VERSION }), 'utf-8');
          }
          if (entryPath.endsWith('mappings.json')) {
            return Buffer.from(JSON.stringify({ properties: {} }), 'utf-8');
          }
          return Buffer.from(JSON.stringify({ _inference_fields: {} }), 'utf-8');
        }),
      });
      downloadToDiskMock.mockResolvedValue('/tmp/openapi-fallback.zip');

      await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: E5 });

      expect(downloadToDiskMock).toHaveBeenCalledTimes(1);
      expect(downloadToDiskMock.mock.calls[0][0]).toBe(fallbackArtifactUrl);
      expect(productDocClient.setOpenapiSpecInstallationSuccessful).toHaveBeenCalledWith(
        expect.objectContaining({ productVersion: '8.15', inferenceId: E5 })
      );

      // Next start: the recorded fallback version is current, nothing is downloaded again
      downloadToDiskMock.mockClear();
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '8.15',
      });

      await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: E5 });

      expect(downloadToDiskMock).not.toHaveBeenCalled();
    });

    it('reinstalls when the fallback version was recorded by a failed installation', async () => {
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'error',
        version: '8.15',
      });

      await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: E5 });

      expect(packageInstaller.installOpenAPISpec).toHaveBeenCalledWith({
        version: '8.15',
        inferenceId: E5,
      });
    });

    it('reinstalls when a newer fallback version is published', async () => {
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '8.14',
      });

      await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: E5 });

      expect(packageInstaller.installOpenAPISpec).toHaveBeenCalledWith({
        version: '8.15',
        inferenceId: E5,
      });
    });

    it('installs the selected version once its artifact is published', async () => {
      checkArtifactAvailableMock.mockResolvedValue(undefined);
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '8.15',
      });

      await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: E5 });

      expect(packageInstaller.installOpenAPISpec).toHaveBeenCalledWith({
        version: '8.16',
        inferenceId: E5,
      });
    });

    it('logs and skips when no OpenAPI artifact exists for the inference ID', async () => {
      checkArtifactAvailableMock.mockRejectedValue(new ArtifactNotFoundError('missing'));
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'uninstalled',
      });

      await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: E5 });

      expect(packageInstaller.installOpenAPISpec).not.toHaveBeenCalled();
      expect(productDocClient.setOpenapiSpecInstallationFailed).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`no artifact available for inference ID [${E5}]`)
      );
    });

    it('propagates artifact probe failures that are not a missing artifact', async () => {
      checkArtifactAvailableMock.mockRejectedValue(new Error('network down'));

      await expect(packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: E5 })).rejects.toThrow(
        'network down'
      );
    });
  });

  describe('ensureOpenApiSpecUpToDate with a forced update', () => {
    const since = new Date('2026-09-17T10:00:00.000Z');

    it('skips the reinstall when another task installed the selected version after the request', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ openapi: ['8.16'] }));
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '8.16',
        updatedAt: '2026-09-17T10:30:00.000Z',
      });
      jest.spyOn(packageInstaller, 'installOpenAPISpec').mockResolvedValue(undefined);

      await packageInstaller.ensureOpenApiSpecUpToDate({
        inferenceId: defaultInferenceEndpoints.ELSER,
        forceUpdate: true,
        since,
      });

      expect(packageInstaller.installOpenAPISpec).not.toHaveBeenCalled();
    });

    it('reinstalls when forced and the spec was not refreshed since the request', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ openapi: ['8.16'] }));
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '8.16',
        updatedAt: '2026-09-17T09:00:00.000Z',
      });
      jest.spyOn(packageInstaller, 'installOpenAPISpec').mockResolvedValue(undefined);

      await packageInstaller.ensureOpenApiSpecUpToDate({
        inferenceId: defaultInferenceEndpoints.ELSER,
        forceUpdate: true,
        since,
      });

      expect(packageInstaller.installOpenAPISpec).toHaveBeenCalledTimes(1);
    });
  });

  describe('ensureOpenApiSpecUpToDate on serverless', () => {
    it('does not reinstall when the most recent `latest` upload is already installed', async () => {
      const serverlessInstaller = new PackageInstaller({
        artifactsFolder,
        logger,
        esClient,
        productDocClient,
        artifactRepositoryUrl,
        kibanaVersion,
        isServerless: true,
      });
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({
          openapi: ['latest-2026-08-20T20:51:06.777Z', 'latest-2026-08-20T23:08:00.384Z'],
        })
      );
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: 'latest-2026-08-20T23:08:00.384Z',
      });
      jest.spyOn(serverlessInstaller, 'installOpenAPISpec').mockResolvedValue(undefined);

      await serverlessInstaller.ensureOpenApiSpecUpToDate({
        inferenceId: '.jina-embeddings-v5-text-small',
      });

      expect(serverlessInstaller.installOpenAPISpec).not.toHaveBeenCalled();
    });
  });

  describe('artifact repository proxy', () => {
    let proxyPackageInstaller: PackageInstaller;

    beforeEach(() => {
      proxyPackageInstaller = new PackageInstaller({
        artifactsFolder,
        logger,
        esClient,
        productDocClient,
        artifactRepositoryUrl,
        artifactRepositoryProxyUrl,
        kibanaVersion,
      });
    });

    it('passes the proxy URL to fetchArtifactVersions in installProduct', async () => {
      jest.spyOn(proxyPackageInstaller, 'installPackage').mockResolvedValue(undefined as never);

      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({
          kibana: ['8.16'],
        })
      );

      await proxyPackageInstaller.installProduct({ productName: 'kibana' });

      expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
        artifactRepositoryProxyUrl,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
    });

    it('passes the proxy URL to downloadToDisk in installPackage', async () => {
      const zipArchive = {
        close: jest.fn(),
      };
      openZipArchiveMock.mockResolvedValue(zipArchive);
      downloadToDiskMock.mockResolvedValue(`${artifactsFolder}/artifact.zip`);

      await proxyPackageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' });

      expect(downloadToDiskMock).toHaveBeenCalledWith(
        expect.stringContaining(artifactRepositoryUrl),
        expect.any(String),
        artifactRepositoryProxyUrl
      );
    });
  });

  describe('uninstallPackage', () => {
    it('performs the uninstall steps', async () => {
      await packageInstaller.uninstallPackage({ productName: 'kibana' });

      expect(esClient.indices.delete).toHaveBeenCalledTimes(1);
      expect(esClient.indices.delete).toHaveBeenCalledWith(
        {
          index: getProductDocIndexName('kibana'),
        },
        expect.objectContaining({ ignore: [404] })
      );

      expect(productDocClient.setUninstalled).toHaveBeenCalledTimes(1);
      expect(productDocClient.setUninstalled).toHaveBeenCalledWith('kibana', undefined);
    });
  });

  describe('uninstallAll', () => {
    it('calls uninstall for all packages', async () => {
      jest.spyOn(packageInstaller, 'uninstallPackage');
      const totalProducts = Object.keys(DocumentationProduct).length;
      await packageInstaller.uninstallAll();

      expect(productDocClient.setUninstallationStarted).toHaveBeenCalledTimes(totalProducts);

      expect(packageInstaller.uninstallPackage).toHaveBeenCalledTimes(totalProducts);
      Object.values(DocumentationProduct).forEach((productName) => {
        expect(packageInstaller.uninstallPackage).toHaveBeenCalledWith({ productName });
      });
      expect(productDocClient.setUninstalled).toHaveBeenCalledTimes(totalProducts);
    });
  });

  describe('installSecurityLabs', () => {
    const VERSION_OLD = '2025.12.01';
    const VERSION_NEW = '2025.12.12';

    it('downloads and installs the latest version when no version is provided', async () => {
      const zipArchive = { close: jest.fn() };
      openZipArchiveMock.mockResolvedValue(zipArchive);
      fetchSecurityLabsVersionsMock.mockResolvedValue([VERSION_OLD, VERSION_NEW]);
      downloadToDiskMock.mockResolvedValue(
        `${artifactsFolder}/${getSecurityLabsArtifactName({ version: VERSION_NEW })}`
      );

      const mappings = {
        properties: {
          semantic: {
            inference_id: '.elser',
            type: 'semantic_text',
            model_settings: {},
          },
        },
      };
      loadMappingFileMock.mockResolvedValue(mappings);
      loadManifestFileMock.mockResolvedValue({ formatVersion: TEST_FORMAT_VERSION } as any);

      await packageInstaller.installSecurityLabs({ inferenceId: defaultInferenceEndpoints.ELSER });

      const artifactName = getSecurityLabsArtifactName({
        version: VERSION_NEW,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
      const indexName = getSecurityLabsIndexName(defaultInferenceEndpoints.ELSER);

      expect(ensureDefaultElserDeployedMock).toHaveBeenCalledTimes(1);

      expect(fetchSecurityLabsVersionsMock).toHaveBeenCalledTimes(1);
      expect(fetchSecurityLabsVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
        artifactRepositoryProxyUrl: undefined,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
      expect(downloadToDiskMock).toHaveBeenCalledWith(
        `${artifactRepositoryUrl}/${artifactName}`,
        `${artifactsFolder}/${artifactName}`,
        undefined
      );

      // Critical: openZipArchive must use the full path returned by downloadToDisk.
      expect(openZipArchiveMock).toHaveBeenCalledWith(`${artifactsFolder}/${artifactName}`);

      expect(createIndexMock).toHaveBeenCalledTimes(1);
      const modifiedMappings = cloneDeep(mappings);
      modifiedMappings.properties.semantic.inference_id = defaultInferenceEndpoints.ELSER;
      expect(createIndexMock).toHaveBeenCalledWith({
        indexName,
        mappings: modifiedMappings,
        manifestVersion: TEST_FORMAT_VERSION,
        esClient,
        log: logger,
      });

      expect(populateIndexMock).toHaveBeenCalledTimes(1);
      expect(populateIndexMock).toHaveBeenCalledWith({
        indexName,
        archive: zipArchive,
        manifestVersion: TEST_FORMAT_VERSION,
        inferenceId: defaultInferenceEndpoints.ELSER,
        esClient,
        log: logger,
      });

      expect(productDocClient.setSecurityLabsInstallationStarted).toHaveBeenCalledWith({
        version: VERSION_NEW,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
      expect(productDocClient.setSecurityLabsInstallationSuccessful).toHaveBeenCalledWith({
        version: VERSION_NEW,
        indexName,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(zipArchive.close).toHaveBeenCalledTimes(1);
    });

    it('does not deploy local ELSER when installing with ELSER in EIS', async () => {
      const inferenceId = defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID;
      const zipArchive = { close: jest.fn() };
      openZipArchiveMock.mockResolvedValue(zipArchive);
      fetchSecurityLabsVersionsMock.mockResolvedValue([VERSION_NEW]);
      downloadToDiskMock.mockResolvedValue(
        `${artifactsFolder}/${getSecurityLabsArtifactName({ version: VERSION_NEW, inferenceId })}`
      );
      loadMappingFileMock.mockResolvedValue({
        properties: { semantic: { inference_id: '.elser', type: 'semantic_text' } },
      });
      loadManifestFileMock.mockResolvedValue({ formatVersion: TEST_FORMAT_VERSION } as any);

      await packageInstaller.installSecurityLabs({ inferenceId });

      expect(ensureDefaultElserDeployedMock).not.toHaveBeenCalled();
      expect(ensureInferenceDeployedMock).toHaveBeenCalledTimes(1);
      expect(ensureInferenceDeployedMock).toHaveBeenCalledWith({ client: esClient, inferenceId });
      expect(productDocClient.setSecurityLabsInstallationSuccessful).toHaveBeenCalledWith({
        version: VERSION_NEW,
        indexName: getSecurityLabsIndexName(inferenceId),
        inferenceId,
      });
    });

    it('calls setSecurityLabsInstallationFailed if installation fails', async () => {
      const zipArchive = { close: jest.fn() };
      openZipArchiveMock.mockResolvedValue(zipArchive);
      fetchSecurityLabsVersionsMock.mockResolvedValue([VERSION_NEW]);
      const artifactName = getSecurityLabsArtifactName({
        version: VERSION_NEW,
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
      downloadToDiskMock.mockResolvedValue(`${artifactsFolder}/${artifactName}`);

      populateIndexMock.mockImplementation(async () => {
        throw new Error('something bad');
      });

      await expect(
        packageInstaller.installSecurityLabs({ inferenceId: defaultInferenceEndpoints.ELSER })
      ).rejects.toThrow();

      expect(productDocClient.setSecurityLabsInstallationFailed).toHaveBeenCalledWith({
        version: VERSION_NEW,
        failureReason: 'something bad',
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(zipArchive.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('ensureSecurityLabsUpToDate', () => {
    beforeEach(() => {
      jest.spyOn(packageInstaller, 'installSecurityLabs').mockResolvedValue(undefined);
    });

    it('installs the newest repository version when it is newer than the installed one', async () => {
      productDocClient.getSecurityLabsInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '2026.07.10-152831',
      });
      fetchSecurityLabsVersionsMock.mockResolvedValue(['2026.07.10-152831', '2026.07.28-052323']);

      await packageInstaller.ensureSecurityLabsUpToDate({ inferenceId: '.elser' });

      expect(packageInstaller.installSecurityLabs).toHaveBeenCalledWith({
        version: '2026.07.28-052323',
        inferenceId: '.elser',
      });
    });

    it('never downgrades to an older repository version unless forced', async () => {
      productDocClient.getSecurityLabsInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '2026.07.28-052323',
      });
      fetchSecurityLabsVersionsMock.mockResolvedValue(['2026.07.10-152831']);

      await packageInstaller.ensureSecurityLabsUpToDate({ inferenceId: '.elser' });
      expect(packageInstaller.installSecurityLabs).not.toHaveBeenCalled();

      await packageInstaller.ensureSecurityLabsUpToDate({
        inferenceId: '.elser',
        forceUpdate: true,
      });
      expect(packageInstaller.installSecurityLabs).toHaveBeenCalledWith({
        version: '2026.07.10-152831',
        inferenceId: '.elser',
      });
    });
  });

  describe('getInstalledRepositoryVersion', () => {
    it('returns the newest LastModified any installed latest artifact came from', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: 'latest-2026-10-01T00:00:00.000Z' },
        elasticsearch: { status: 'installed', version: 'latest-2026-10-12T20:25:34.000Z' },
        security: { status: 'uninstalled', version: 'latest-2026-10-20T00:00:00.000Z' },
        observability: { status: 'installed', version: '9.7' },
      } as unknown as Record<ProductName, ProductInstallState>);
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: 'latest-2026-10-05T00:00:00.000Z',
      });

      await expect(
        packageInstaller.getInstalledRepositoryVersion({ inferenceId: '.elser' })
      ).resolves.toBe('2026-10-12T20:25:34.000Z');
    });

    it('is undefined when nothing was installed from a latest artifact', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '9.7' },
      } as unknown as Record<ProductName, ProductInstallState>);

      await expect(
        packageInstaller.getInstalledRepositoryVersion({ inferenceId: '.elser' })
      ).resolves.toBeUndefined();
    });
  });

  describe('installSecurityLabs status preservation', () => {
    beforeEach(() => {
      fetchSecurityLabsVersionsMock.mockResolvedValue(['2025.12.12']);
    });

    it('keeps a previously installed status when the new archive cannot be prepared', async () => {
      productDocClient.getSecurityLabsInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '2025.11.01',
      });
      downloadToDiskMock.mockRejectedValue(new Error('network down'));

      await expect(
        packageInstaller.installSecurityLabs({ inferenceId: defaultInferenceEndpoints.ELSER })
      ).rejects.toThrow('network down');

      expect(productDocClient.setSecurityLabsInstallationStarted).not.toHaveBeenCalled();
      expect(productDocClient.setSecurityLabsInstallationFailed).not.toHaveBeenCalled();
      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });

    it('marks a fresh install as failed when the archive cannot be prepared', async () => {
      downloadToDiskMock.mockRejectedValue(new Error('network down'));

      await expect(
        packageInstaller.installSecurityLabs({ inferenceId: defaultInferenceEndpoints.ELSER })
      ).rejects.toThrow('network down');

      expect(productDocClient.setSecurityLabsInstallationFailed).toHaveBeenCalledWith(
        expect.objectContaining({ failureReason: 'network down' })
      );
    });
  });

  describe('on serverless', () => {
    const EIS_ELSER = defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID;
    const VERSION = '2025.12.12';

    beforeEach(() => {
      packageInstaller = new PackageInstaller({
        artifactsFolder,
        logger,
        esClient,
        productDocClient,
        artifactRepositoryUrl,
        kibanaVersion,
        isServerless: true,
      });
      openZipArchiveMock.mockResolvedValue({ close: jest.fn() });
      loadMappingFileMock.mockResolvedValue({
        properties: { semantic: { inference_id: '.elser', type: 'semantic_text' } },
      });
      loadManifestFileMock.mockResolvedValue({ formatVersion: TEST_FORMAT_VERSION } as any);
      fetchSecurityLabsVersionsMock.mockResolvedValue([VERSION]);
      downloadToDiskMock.mockResolvedValue(`${artifactsFolder}/artifact.zip`);
    });

    it('checks a missing `latest` product artifact once across timestamped fallback versions', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({
          kibana: ['latest-2026-08-20T23:08:00.384Z', 'latest-2026-08-20T20:51:06.777Z'],
        })
      );
      checkArtifactAvailableMock.mockRejectedValue(new ArtifactNotFoundError('missing'));

      await expect(packageInstaller.installProduct({ productName: 'kibana' })).resolves.toBe(false);

      expect(checkArtifactAvailableMock).toHaveBeenCalledTimes(1);
      expect(downloadToDiskMock).not.toHaveBeenCalled();
      expect(productDocClient.setInstallationFailed).toHaveBeenCalledWith(
        'kibana',
        expect.stringContaining(
          'No documentation artifact available for product [kibana]/[latest]'
        ),
        defaultInferenceEndpoints.ELSER
      );
    });

    it('selects the most recent `latest` upload rather than the first listed one', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({
          kibana: ['latest-2026-08-20T20:51:06.777Z', 'latest-2026-08-20T23:08:00.384Z'],
        })
      );
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: 'latest-2026-08-20T23:08:00.384Z' },
      } as never);

      await expect(
        packageInstaller.getProductsToUpdate({ inferenceId: EIS_ELSER })
      ).resolves.toEqual([]);
    });

    describe('re-download decision per inference ID', () => {
      const JINA = defaultInferenceEndpoints.JINAv5;
      const JINA_UPLOAD = 'latest-2026-10-12T20:25:34.221Z';
      const LATER_UPLOAD = 'latest-2026-11-20T08:00:00.000Z';

      it('records a failed installation with the user-facing reason when only other variants are published', async () => {
        fetchArtifactVersionsMock.mockResolvedValue(
          repositoryVersions({ kibana: [], openapi: [] }, ['kibana', 'openapi'])
        );
        productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
          kibana: { status: 'uninstalled' },
        } as never);

        await expect(
          packageInstaller.installProductIfNeeded({
            productName: 'kibana',
            inferenceId: JINA,
            since: new Date('2026-11-01T00:00:00.000Z'),
          })
        ).resolves.toBe(false);

        expect(productDocClient.setInstallationFailed).toHaveBeenCalledWith(
          'kibana',
          `No documentation artifact available for product [kibana]/[latest] for Inference ID [${JINA}]. Please select a different model or contact your administrator.`,
          JINA
        );
        expect(checkArtifactAvailableMock).not.toHaveBeenCalled();
        expect(downloadToDiskMock).not.toHaveBeenCalled();
      });

      it('warns without a status change when the product is absent from the repository', async () => {
        fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: [] }));
        productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
          kibana: { status: 'uninstalled' },
        } as never);

        await expect(
          packageInstaller.installProductIfNeeded({
            productName: 'kibana',
            inferenceId: JINA,
            since: new Date('2026-11-01T00:00:00.000Z'),
          })
        ).resolves.toBe(false);

        expect(logger.warn).toHaveBeenCalledWith('No version found for product [kibana]');
        expect(productDocClient.setInstallationFailed).not.toHaveBeenCalled();
      });

      it('lists the `latest` versions of the inference ID being updated', async () => {
        fetchArtifactVersionsMock.mockResolvedValue(
          repositoryVersions({ kibana: [JINA_UPLOAD], openapi: [] })
        );
        productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
          kibana: { status: 'installed', version: JINA_UPLOAD },
        } as never);

        await packageInstaller.getProductsToUpdate({ inferenceId: JINA });

        expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
          artifactRepositoryUrl,
          inferenceId: JINA,
        });
      });

      it('does not re-download when the artifact of the inference ID is unchanged', async () => {
        fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: [JINA_UPLOAD] }));
        productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
          kibana: { status: 'installed', version: JINA_UPLOAD },
        } as never);

        await expect(packageInstaller.getProductsToUpdate({ inferenceId: JINA })).resolves.toEqual(
          []
        );
        await expect(
          packageInstaller.updateProductIfNeeded({
            productName: 'kibana',
            inferenceId: JINA,
            since: new Date('2026-11-01T00:00:00.000Z'),
          })
        ).resolves.toBe(false);
        expect(downloadToDiskMock).not.toHaveBeenCalled();
      });

      it('re-downloads when the artifact of the inference ID was republished', async () => {
        fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: [LATER_UPLOAD] }));
        productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
          kibana: { status: 'installed', version: JINA_UPLOAD },
        } as never);
        esClient.inference.get.mockResolvedValue({
          endpoints: [{ inference_id: JINA, task_type: 'text_embedding', service: 'elastic' }],
        } as never);

        await expect(packageInstaller.getProductsToUpdate({ inferenceId: JINA })).resolves.toEqual([
          'kibana',
        ]);
        await expect(
          packageInstaller.updateProductIfNeeded({
            productName: 'kibana',
            inferenceId: JINA,
            since: new Date('2026-11-01T00:00:00.000Z'),
          })
        ).resolves.toBe(true);
        expect(downloadToDiskMock).toHaveBeenCalledTimes(1);
        expect(downloadToDiskMock.mock.calls[0][0]).toBe(
          `${artifactRepositoryUrl}/kb-product-doc-kibana-latest--${JINA}.zip`
        );
        expect(productDocClient.setInstallationStarted).toHaveBeenCalledWith(
          expect.objectContaining({ productVersion: LATER_UPLOAD, inferenceId: JINA })
        );
      });

      it('does not re-download when the installed version was recorded from a newer variant upload', async () => {
        fetchArtifactVersionsMock.mockResolvedValue(
          repositoryVersions({
            kibana: [JINA_UPLOAD],
            openapi: [JINA_UPLOAD],
          })
        );
        productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
          kibana: { status: 'installed', version: LATER_UPLOAD },
        } as never);
        productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
          status: 'installed',
          version: LATER_UPLOAD,
        });
        jest.spyOn(packageInstaller, 'installOpenAPISpec').mockResolvedValue(undefined);

        await expect(packageInstaller.getProductsToUpdate({ inferenceId: JINA })).resolves.toEqual(
          []
        );
        await expect(
          packageInstaller.updateProductIfNeeded({
            productName: 'kibana',
            inferenceId: JINA,
            since: new Date('2026-11-01T00:00:00.000Z'),
          })
        ).resolves.toBe(false);
        await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: JINA });
        expect(downloadToDiskMock).not.toHaveBeenCalled();
        expect(packageInstaller.installOpenAPISpec).not.toHaveBeenCalled();
      });

      it('still re-downloads a forced update of an unchanged artifact', async () => {
        fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ kibana: [JINA_UPLOAD] }));
        productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
          kibana: {
            status: 'installed',
            version: JINA_UPLOAD,
            updatedAt: '2026-10-13T00:00:00.000Z',
          },
        } as never);
        jest.spyOn(packageInstaller, 'installPackage').mockResolvedValue(undefined as never);

        await expect(
          packageInstaller.getProductsToUpdate({ inferenceId: JINA, forceUpdate: true })
        ).resolves.toEqual(['kibana']);
        await expect(
          packageInstaller.updateProductIfNeeded({
            productName: 'kibana',
            inferenceId: JINA,
            forceUpdate: true,
            since: new Date('2026-11-01T00:00:00.000Z'),
          })
        ).resolves.toBe(true);
      });

      it('reinstalls the OpenAPI spec only when the artifact of the inference ID was republished', async () => {
        jest.spyOn(packageInstaller, 'installOpenAPISpec').mockResolvedValue(undefined);
        productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
          status: 'installed',
          version: JINA_UPLOAD,
        });

        fetchArtifactVersionsMock.mockResolvedValue(repositoryVersions({ openapi: [JINA_UPLOAD] }));
        await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: JINA });
        expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
          artifactRepositoryUrl,
          inferenceId: JINA,
        });
        expect(packageInstaller.installOpenAPISpec).not.toHaveBeenCalled();

        fetchArtifactVersionsMock.mockResolvedValue(
          repositoryVersions({ openapi: [LATER_UPLOAD] })
        );
        await packageInstaller.ensureOpenApiSpecUpToDate({ inferenceId: JINA });
        expect(packageInstaller.installOpenAPISpec).toHaveBeenCalledWith({
          version: LATER_UPLOAD,
          inferenceId: JINA,
        });
      });
    });

    it('installs product documentation with an EIS endpoint', async () => {
      await packageInstaller.installPackage({
        productName: 'kibana',
        productVersion: '8.16',
        customInference: {
          inference_id: EIS_ELSER,
          task_type: 'sparse_embedding' as InferenceTaskType,
          service: 'elastic',
          service_settings: {},
        },
      });

      expect(ensureDefaultElserDeployedMock).not.toHaveBeenCalled();
      expect(ensureInferenceDeployedMock).not.toHaveBeenCalled();
      expect(productDocClient.setInstallationSuccessful).toHaveBeenCalledTimes(1);
    });

    it('refuses to install product documentation with the local default ELSER', async () => {
      await expect(
        packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' })
      ).rejects.toThrow(/Only EIS endpoints are supported on serverless/);

      expect(ensureDefaultElserDeployedMock).not.toHaveBeenCalled();
      expect(ensureInferenceDeployedMock).not.toHaveBeenCalled();
      expect(productDocClient.setInstallationFailed).toHaveBeenCalledWith(
        'kibana',
        expect.stringContaining('Only EIS endpoints are supported on serverless'),
        defaultInferenceEndpoints.ELSER
      );
    });

    it('refuses to install product documentation with an ML node hosted endpoint', async () => {
      await expect(
        packageInstaller.installPackage({
          productName: 'kibana',
          productVersion: '8.16',
          customInference: {
            inference_id: 'my-e5',
            task_type: 'text_embedding' as InferenceTaskType,
            service: 'elasticsearch',
            service_settings: {},
          },
        })
      ).rejects.toThrow(/Only EIS endpoints are supported on serverless/);

      expect(ensureDefaultElserDeployedMock).not.toHaveBeenCalled();
      expect(ensureInferenceDeployedMock).not.toHaveBeenCalled();
    });

    it('installs Security Labs with an EIS endpoint', async () => {
      esClient.inference.get.mockResolvedValue({
        endpoints: [{ inference_id: EIS_ELSER, service: 'elastic' }],
      } as never);

      await packageInstaller.installSecurityLabs({ inferenceId: EIS_ELSER });

      expect(esClient.inference.get).toHaveBeenCalledWith({ inference_id: EIS_ELSER });
      expect(ensureDefaultElserDeployedMock).not.toHaveBeenCalled();
      expect(ensureInferenceDeployedMock).not.toHaveBeenCalled();
      expect(productDocClient.setSecurityLabsInstallationSuccessful).toHaveBeenCalledTimes(1);
    });

    it('refuses to install Security Labs with the local default ELSER', async () => {
      esClient.inference.get.mockResolvedValue({
        endpoints: [{ inference_id: defaultInferenceEndpoints.ELSER, service: 'elasticsearch' }],
      } as never);

      await expect(packageInstaller.installSecurityLabs({})).rejects.toThrow(
        /Only EIS endpoints are supported on serverless/
      );

      expect(ensureDefaultElserDeployedMock).not.toHaveBeenCalled();
      expect(ensureInferenceDeployedMock).not.toHaveBeenCalled();
      expect(productDocClient.setSecurityLabsInstallationFailed).toHaveBeenCalledWith({
        version: undefined,
        failureReason: expect.stringContaining('Only EIS endpoints are supported on serverless'),
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
    });

    it('refuses to install OpenAPI specs with the local default ELSER', async () => {
      esClient.inference.get.mockResolvedValue({
        endpoints: [{ inference_id: defaultInferenceEndpoints.ELSER, service: 'elasticsearch' }],
      } as never);

      await expect(packageInstaller.installOpenAPISpec({ version: '8.16' })).rejects.toThrow(
        /Only EIS endpoints are supported on serverless/
      );

      expect(ensureDefaultElserDeployedMock).not.toHaveBeenCalled();
      expect(ensureInferenceDeployedMock).not.toHaveBeenCalled();
    });
  });

  describe('installOpenAPISpec', () => {
    const getOpenApiArchive = () => ({
      close: jest.fn(),
      hasEntry: jest.fn().mockReturnValue(true),
      getEntryPaths: jest
        .fn()
        .mockReturnValue([
          'kibana/content/content-0.ndjson',
          'elasticsearch/content/content-0.ndjson',
        ]),
      getEntryContent: jest.fn().mockImplementation(async (entryPath: string) => {
        if (entryPath.endsWith('manifest.json')) {
          return Buffer.from(JSON.stringify({ formatVersion: TEST_FORMAT_VERSION }), 'utf-8');
        }
        if (entryPath.endsWith('mappings.json')) {
          return Buffer.from(JSON.stringify({ properties: {} }), 'utf-8');
        }
        return Buffer.from(
          JSON.stringify({
            _inference_fields: {
              semantic: {
                inference: {
                  inference_id: defaultInferenceEndpoints.ELSER,
                },
              },
            },
          }),
          'utf-8'
        );
      }),
    });

    beforeEach(() => {
      esClient.bulk.mockResolvedValue({ errors: false } as never);
    });

    it('downloads the `latest` artifact for a `latest-<timestamp>` version', async () => {
      openZipArchiveMock.mockResolvedValueOnce(getOpenApiArchive());
      downloadToDiskMock.mockResolvedValue('/tmp/openapi-latest.zip');

      await packageInstaller.installOpenAPISpec({
        version: 'latest-2026-08-20T23:08:00.384Z',
        inferenceId: '.jina-embeddings-v5-text-small',
      });

      const latestArtifactUrl = `${artifactRepositoryUrl}/kb-product-doc-openapi-latest--.jina-embeddings-v5-text-small.zip`;
      expect(checkArtifactAvailableMock).toHaveBeenCalledWith(latestArtifactUrl, undefined);
      expect(downloadToDiskMock).toHaveBeenCalledTimes(1);
      expect(downloadToDiskMock.mock.calls[0][0]).toBe(latestArtifactUrl);
      expect(productDocClient.setOpenapiSpecInstallationSuccessful).toHaveBeenCalledWith(
        expect.objectContaining({ productVersion: 'latest-2026-08-20T23:08:00.384Z' })
      );
    });

    it('defaults to the newest `latest` version of the repository on serverless', async () => {
      const serverlessInstaller = new PackageInstaller({
        artifactsFolder,
        logger,
        esClient,
        productDocClient,
        artifactRepositoryUrl,
        kibanaVersion,
        isServerless: true,
      });
      esClient.inference.get.mockResolvedValue({
        endpoints: [
          {
            inference_id: '.jina-embeddings-v5-text-small',
            service: 'elastic',
            task_type: 'text_embedding' as InferenceTaskType,
            service_settings: {},
          },
        ],
      });
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({ openapi: ['latest-2026-10-12T20:25:34.000Z'] })
      );
      openZipArchiveMock.mockResolvedValueOnce(getOpenApiArchive());
      downloadToDiskMock.mockResolvedValue('/bundle/kb-product-doc-openapi-latest.zip');

      await serverlessInstaller.installOpenAPISpec({
        inferenceId: '.jina-embeddings-v5-text-small',
      });

      const latestArtifactUrl = `${artifactRepositoryUrl}/kb-product-doc-openapi-latest--.jina-embeddings-v5-text-small.zip`;
      expect(checkArtifactAvailableMock).toHaveBeenCalledTimes(1);
      expect(checkArtifactAvailableMock).toHaveBeenCalledWith(latestArtifactUrl, undefined);
      expect(downloadToDiskMock.mock.calls[0][0]).toBe(latestArtifactUrl);
      expect(productDocClient.setOpenapiSpecInstallationSuccessful).toHaveBeenCalledWith(
        expect.objectContaining({ productVersion: 'latest-2026-10-12T20:25:34.000Z' })
      );
    });

    it('defaults to the stack version outside serverless', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({ openapi: ['8.16', '8.15', 'latest'] })
      );
      openZipArchiveMock.mockResolvedValueOnce(getOpenApiArchive());
      downloadToDiskMock.mockResolvedValue('/tmp/openapi-stack.zip');

      await packageInstaller.installOpenAPISpec({ inferenceId: defaultInferenceEndpoints.ELSER });

      expect(downloadToDiskMock.mock.calls[0][0]).toBe(
        `${artifactRepositoryUrl}/kb-product-doc-openapi-8.16.zip`
      );
      expect(productDocClient.setOpenapiSpecInstallationSuccessful).toHaveBeenCalledWith(
        expect.objectContaining({ productVersion: '8.16' })
      );
    });

    it('checks a missing `latest` artifact once even when several timestamped versions map to it', async () => {
      fetchArtifactVersionsMock.mockResolvedValue(
        repositoryVersions({
          openapi: [
            'latest-2026-08-20T23:08:00.384Z',
            'latest-2026-08-20T20:51:06.777Z',
            'latest-2026-07-01T00:00:00.000Z',
          ],
        })
      );
      checkArtifactAvailableMock.mockRejectedValue(new ArtifactNotFoundError('missing'));

      await expect(
        packageInstaller.installOpenAPISpec({
          version: 'latest-2026-08-20T23:08:00.384Z',
          inferenceId: '.jina-embeddings-v5-text-small',
        })
      ).rejects.toThrow('Artifact not found');

      expect(checkArtifactAvailableMock).toHaveBeenCalledTimes(1);
      expect(downloadToDiskMock).not.toHaveBeenCalled();
    });

    it('deletes the downloaded artifact and logs the folder usage after installing', async () => {
      openZipArchiveMock.mockResolvedValueOnce(getOpenApiArchive());
      downloadToDiskMock.mockResolvedValue(downloadedPath('kb-product-doc-openapi-8.16.zip'));

      await packageInstaller.installOpenAPISpec({
        version: '8.16',
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(removeArtifactFileMock).toHaveBeenCalledWith(
        downloadedPath('kb-product-doc-openapi-8.16.zip'),
        logger
      );
      expect(logArtifactsFolderUsageMock).toHaveBeenCalledTimes(1);
    });

    it('leaves an OpenAPI artifact of a local repository in place', async () => {
      openZipArchiveMock.mockResolvedValueOnce(getOpenApiArchive());
      downloadToDiskMock.mockResolvedValue(bundledPath('kb-product-doc-openapi-8.16.zip'));

      await packageInstaller.installOpenAPISpec({
        version: '8.16',
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(removeArtifactFileMock).not.toHaveBeenCalled();
    });

    it('does not fetch artifact versions when explicit version is directly installable', async () => {
      openZipArchiveMock.mockResolvedValueOnce(getOpenApiArchive());
      downloadToDiskMock.mockResolvedValue('/tmp/openapi-explicit.zip');

      await packageInstaller.installOpenAPISpec({
        version: '8.16',
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(fetchArtifactVersionsMock).not.toHaveBeenCalled();
      expect(productDocClient.setOpenapiSpecInstallationStarted).toHaveBeenCalledWith(
        expect.objectContaining({
          productVersion: '8.16',
          inferenceId: defaultInferenceEndpoints.ELSER,
        })
      );
    });

    it('retries listing and falls back to previous explicit version when selected is missing', async () => {
      checkArtifactAvailableMock
        .mockRejectedValueOnce(new ArtifactNotFoundError('missing')) // explicit version
        .mockResolvedValueOnce(undefined); // fallback version
      openZipArchiveMock.mockResolvedValueOnce(getOpenApiArchive());
      downloadToDiskMock.mockResolvedValue('/tmp/openapi-fallback.zip');

      fetchArtifactVersionsMock
        .mockRejectedValueOnce(new Error('temporary listing failure'))
        .mockResolvedValueOnce(repositoryVersions({ openapi: ['8.16', '8.15'] }));

      await packageInstaller.installOpenAPISpec({
        version: '8.16',
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(fetchArtifactVersionsMock).toHaveBeenCalledTimes(2);
      expect(productDocClient.setOpenapiSpecInstallationStarted).toHaveBeenCalledWith(
        expect.objectContaining({
          productVersion: '8.15',
          inferenceId: defaultInferenceEndpoints.ELSER,
        })
      );
    });
  });
});
