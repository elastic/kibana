/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
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
import { cloneDeep } from 'lodash';
import type { ProductName } from '@kbn/product-doc-common';
import {
  getArtifactName,
  getProductDocIndexName,
  getSecurityLabsArtifactName,
  getSecurityLabsIndexName,
  DocumentationProduct,
} from '@kbn/product-doc-common';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { installClientMock } from '../doc_install_status/service.mock';
import type { ProductInstallState } from '../../../common/install_status';
import { PackageInstaller } from './package_installer';
import { ArtifactNotFoundError } from './utils/download';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

const artifactsFolder = '/lost';
const artifactRepositoryUrl = 'https://repository.com';
const artifactRepositoryProxyUrl = 'http://proxy.example.com:3128';
const kibanaVersion = '8.16.3';

const callOrder = (fn: { mock: { invocationCallOrder: number[] } }): number => {
  return fn.mock.invocationCallOrder[0];
};

const TEST_FORMAT_VERSION = '2.0.0';

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
      downloadToDiskMock.mockResolvedValue('/data/lost/kb-product-doc-kibana-8.16.zip');

      await packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' });

      expect(removeArtifactFileMock).toHaveBeenCalledWith(
        expect.stringContaining('kb-product-doc-kibana-8.16.zip'),
        logger
      );
      expect(logArtifactsFolderUsageMock).toHaveBeenCalledTimes(1);
    });

    it('deletes the downloaded artifact when the install fails', async () => {
      downloadToDiskMock.mockResolvedValue('/data/lost/kb-product-doc-kibana-8.16.zip');
      openZipArchiveMock.mockRejectedValue(new Error('corrupt archive'));

      await expect(
        packageInstaller.installPackage({ productName: 'kibana', productVersion: '8.16' })
      ).rejects.toThrow('corrupt archive');

      expect(removeArtifactFileMock).toHaveBeenCalledWith(
        expect.stringContaining('kb-product-doc-kibana-8.16.zip'),
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

  describe('installALl', () => {
    it('installs all the packages to their latest version', async () => {
      jest.spyOn(packageInstaller, 'installPackage');

      fetchArtifactVersionsMock.mockResolvedValue({
        kibana: ['8.15', '8.16'],
        elasticsearch: ['8.15'],
      });

      await packageInstaller.installAll({ inferenceId: defaultInferenceEndpoints.ELSER });

      expect(packageInstaller.installPackage).toHaveBeenCalledTimes(2);

      expect(packageInstaller.installPackage).toHaveBeenCalledWith({
        productName: 'kibana',
        productVersion: '8.16',
      });
      expect(packageInstaller.installPackage).toHaveBeenCalledWith({
        productName: 'elasticsearch',
        productVersion: '8.15',
      });
    });

    it('falls back to previous version when selected artifact is missing', async () => {
      jest.spyOn(packageInstaller, 'installPackage').mockResolvedValue(undefined as never);

      fetchArtifactVersionsMock.mockResolvedValue({
        kibana: ['8.15', '8.16'],
      });

      checkArtifactAvailableMock
        .mockRejectedValueOnce(new ArtifactNotFoundError('missing')) // 8.16
        .mockResolvedValueOnce(undefined); // 8.15

      await packageInstaller.installAll();

      expect(packageInstaller.installPackage).toHaveBeenCalledTimes(1);
      expect(packageInstaller.installPackage).toHaveBeenCalledWith({
        productName: 'kibana',
        productVersion: '8.15',
        customInference: undefined,
      });
    });
  });

  describe('ensureUpToDate', () => {
    it('updates the installed packages to the latest version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({
        kibana: ['8.15', '8.16'],
        security: ['8.15', '8.16'],
        elasticsearch: ['8.15'],
        openapi: [],
      });

      productDocClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
        security: { status: 'installed', version: '8.16' },
        elasticsearch: { status: 'uninstalled' },
      } as Record<ProductName, ProductInstallState>);

      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'uninstalled',
      });

      jest.spyOn(packageInstaller, 'installPackage');

      await packageInstaller.ensureUpToDate({ inferenceId: defaultInferenceEndpoints.ELSER });

      expect(packageInstaller.installPackage).toHaveBeenCalledTimes(1);
      expect(packageInstaller.installPackage).toHaveBeenCalledWith({
        productName: 'kibana',
        productVersion: '8.16',
      });
    });

    it('passes the artifact repository proxy URL when fetching versions', async () => {
      const proxyPackageInstaller = new PackageInstaller({
        artifactsFolder,
        logger,
        esClient,
        productDocClient,
        artifactRepositoryUrl,
        artifactRepositoryProxyUrl,
        kibanaVersion,
      });

      fetchArtifactVersionsMock.mockResolvedValue({
        kibana: ['8.16'],
        security: [],
        elasticsearch: [],
        observability: [],
        openapi: [],
      });

      productDocClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'uninstalled' },
        security: { status: 'uninstalled' },
        elasticsearch: { status: 'uninstalled' },
        observability: { status: 'uninstalled' },
      } as Record<ProductName, ProductInstallState>);

      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'uninstalled',
      });

      await proxyPackageInstaller.ensureUpToDate({ inferenceId: defaultInferenceEndpoints.ELSER });

      expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
        artifactRepositoryProxyUrl,
      });
    });
  });

  describe('installProduct', () => {
    it('installs the version selected for the current stack version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({
        kibana: ['8.15', '8.16'],
      });
      jest.spyOn(packageInstaller, 'installPackage').mockResolvedValue(undefined as never);

      await expect(packageInstaller.installProduct({ productName: 'kibana' })).resolves.toBe(true);

      expect(packageInstaller.installPackage).toHaveBeenCalledTimes(1);
      expect(packageInstaller.installPackage).toHaveBeenCalledWith({
        productName: 'kibana',
        productVersion: '8.16',
      });
    });

    it('warns and skips when the repository has no version for the product', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({ kibana: [] });
      jest.spyOn(packageInstaller, 'installPackage');

      await expect(packageInstaller.installProduct({ productName: 'kibana' })).resolves.toBe(false);

      expect(packageInstaller.installPackage).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('No version found for product [kibana]');
    });
  });

  describe('purgeArtifactsFolder', () => {
    it('purges the resolved artifacts folder', async () => {
      purgeArtifactsFolderMock.mockResolvedValue({ files: 2, bytes: 10 });

      await expect(packageInstaller.purgeArtifactsFolder()).resolves.toEqual({
        files: 2,
        bytes: 10,
      });

      expect(purgeArtifactsFolderMock).toHaveBeenCalledWith(expect.stringMatching(/lost$/), logger);
    });
  });

  describe('hasUninstalledProducts', () => {
    it('propagates status read failures instead of reporting an uninstall', async () => {
      productDocClient.getInstallationStatusOrThrow.mockRejectedValue(new Error('es unavailable'));

      await expect(
        packageInstaller.hasUninstalledProducts({ productNames: ['kibana'], inferenceId: '.elser' })
      ).rejects.toThrow('es unavailable');
    });

    it('returns true when one of the products is uninstalled', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
        security: { status: 'uninstalled' },
      } as never);

      await expect(
        packageInstaller.hasUninstalledProducts({
          productNames: ['kibana', 'security'],
          inferenceId: '.elser',
        })
      ).resolves.toBe(true);
    });

    it('returns false when all products are still installed', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
      } as never);

      await expect(
        packageInstaller.hasUninstalledProducts({ productNames: ['kibana'], inferenceId: '.elser' })
      ).resolves.toBe(false);
    });

    it('returns false without querying when no products are given', async () => {
      await expect(
        packageInstaller.hasUninstalledProducts({ productNames: [], inferenceId: '.elser' })
      ).resolves.toBe(false);
      expect(productDocClient.getInstallationStatusOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    it('re-installs a product that is still installed', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
      } as never);
      jest.spyOn(packageInstaller, 'installProduct').mockResolvedValue(true);

      await expect(
        packageInstaller.updateProduct({ productName: 'kibana', inferenceId: '.elser' })
      ).resolves.toBe(true);

      expect(packageInstaller.installProduct).toHaveBeenCalledWith({
        productName: 'kibana',
        inferenceId: '.elser',
      });
    });

    it('skips a product that was uninstalled after the update was planned', async () => {
      productDocClient.getInstallationStatusOrThrow.mockResolvedValue({
        kibana: { status: 'uninstalled' },
      } as never);
      jest.spyOn(packageInstaller, 'installProduct');

      await expect(
        packageInstaller.updateProduct({ productName: 'kibana', inferenceId: '.elser' })
      ).resolves.toBe(false);

      expect(packageInstaller.installProduct).not.toHaveBeenCalled();
    });

    it('propagates status read failures instead of skipping the product', async () => {
      productDocClient.getInstallationStatusOrThrow.mockRejectedValue(new Error('es unavailable'));

      await expect(
        packageInstaller.updateProduct({ productName: 'kibana', inferenceId: '.elser' })
      ).rejects.toThrow('es unavailable');
    });
  });

  describe('getProductsToUpdate', () => {
    it('returns installed products whose version differs from the selected version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({
        kibana: ['8.15', '8.16'],
        security: ['8.15', '8.16'],
        elasticsearch: ['8.16'],
        openapi: [],
      });
      productDocClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'installed', version: '8.15' },
        security: { status: 'installed', version: '8.16' },
        elasticsearch: { status: 'uninstalled' },
      } as Record<ProductName, ProductInstallState>);

      const products = await packageInstaller.getProductsToUpdate({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(products).toEqual(['kibana']);
    });

    it('returns every installed product when forceUpdate is set', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({
        kibana: ['8.16'],
        security: ['8.16'],
        openapi: [],
      });
      productDocClient.getInstallationStatus.mockResolvedValue({
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

  describe('ensureOpenApiSpecUpToDate', () => {
    it('does not reinstall when the installed version matches the selected version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({ openapi: ['8.16'] });
      productDocClient.getOpenapiSpecInstallationStatus.mockResolvedValue({
        status: 'installed',
        version: '8.16',
      });
      jest.spyOn(packageInstaller, 'installOpenAPISpec').mockResolvedValue(undefined);

      await packageInstaller.ensureOpenApiSpecUpToDate({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(packageInstaller.installOpenAPISpec).not.toHaveBeenCalled();
    });

    it('installs when the installed version differs from the selected version', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({ openapi: ['8.15', '8.16'] });
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
      fetchArtifactVersionsMock.mockResolvedValue({
        openapi: ['latest-2026-08-20T20:51:06.777Z', 'latest-2026-08-20T23:08:00.384Z'],
      });
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

    it('passes the proxy URL to fetchArtifactVersions in installAll', async () => {
      jest.spyOn(proxyPackageInstaller, 'installPackage').mockResolvedValue(undefined as never);

      fetchArtifactVersionsMock.mockResolvedValue({
        kibana: ['8.16'],
      });

      await proxyPackageInstaller.installAll();

      expect(fetchArtifactVersionsMock).toHaveBeenCalledWith({
        artifactRepositoryUrl,
        artifactRepositoryProxyUrl,
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
      fetchArtifactVersionsMock.mockResolvedValue({
        kibana: ['latest-2026-08-20T23:08:00.384Z', 'latest-2026-08-20T20:51:06.777Z'],
      });
      checkArtifactAvailableMock.mockRejectedValue(new ArtifactNotFoundError('missing'));

      await expect(packageInstaller.installProduct({ productName: 'kibana' })).rejects.toThrow(
        'Artifact not found'
      );

      expect(checkArtifactAvailableMock).toHaveBeenCalledTimes(1);
      expect(downloadToDiskMock).not.toHaveBeenCalled();
    });

    it('selects the most recent `latest` upload rather than the first listed one', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({
        kibana: ['latest-2026-08-20T20:51:06.777Z', 'latest-2026-08-20T23:08:00.384Z'],
      });
      productDocClient.getInstallationStatus.mockResolvedValue({
        kibana: { status: 'installed', version: 'latest-2026-08-20T23:08:00.384Z' },
      } as never);

      await expect(
        packageInstaller.getProductsToUpdate({ inferenceId: EIS_ELSER })
      ).resolves.toEqual([]);
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
      getEntryStream: jest.fn().mockImplementation(async () =>
        Readable.from([
          Buffer.from(
            JSON.stringify({
              _inference_fields: {
                semantic: {
                  inference: {
                    inference_id: defaultInferenceEndpoints.ELSER,
                  },
                },
              },
            })
          ),
        ])
      ),
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

    it('checks a missing `latest` artifact once even when several timestamped versions map to it', async () => {
      fetchArtifactVersionsMock.mockResolvedValue({
        openapi: [
          'latest-2026-08-20T23:08:00.384Z',
          'latest-2026-08-20T20:51:06.777Z',
          'latest-2026-07-01T00:00:00.000Z',
        ],
      });
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
      downloadToDiskMock.mockResolvedValue('/data/lost/kb-product-doc-openapi-8.16.zip');

      await packageInstaller.installOpenAPISpec({
        version: '8.16',
        inferenceId: defaultInferenceEndpoints.ELSER,
      });

      expect(removeArtifactFileMock).toHaveBeenCalledWith(
        expect.stringContaining('kb-product-doc-openapi-8.16.zip'),
        logger
      );
      expect(logArtifactsFolderUsageMock).toHaveBeenCalledTimes(1);
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
        .mockResolvedValueOnce({
          openapi: ['8.16', '8.15'],
        });

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
